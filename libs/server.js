import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import EventEmitter from 'events'
import { open, watch } from 'fs/promises'
import { watch as watchCallback } from 'fs'

import Logger from 'simple-node-logger'

import HttpError from './http-error.js'
import { getContentType } from './util.js'

const logger = Logger.createSimpleLogger()

const __filename = fileURLToPath( import.meta.url )
const __dirname = path.dirname( __filename )

export default class Server extends EventEmitter {
  _port = 3000
  _publicDir = __dirname + "/../public"
  _dashDir   = __dirname + "/../dash-data"
  _app = null

  /**
   * 
   * @param {object} param 
   * @param {number} [param.port] - port number (default = 3000)
   * @param {string} [param.logLevel] - log level (default = 'info')
   * 
   * @returns 
   */
  static create( { port, logLevel } ) {
    logger.setLevel( logLevel || 'info' )
    return new this( { port } )
  }

  /**
   * 
   * @param {FileHandle} handler - file handler 
   * @param {Response}   res     - http response object
   * @param {number}     [pos]   - current position of file
   * @returns {Promise<number>}  - bytesRead
   */
  static readThenSend = async ( handler, res, pos = 0 ) => {
    const { size } = await handler.stat()
      .catch(err => { throw new HttpError(err.message, 500) })

    const len = size - pos
    const buff = Buffer.alloc( len )
    const { bytesRead } = await handler.read(buff, 0, len, pos )
      .catch(err => { throw new HttpError(err.message, 500) })

    res.write( buff.slice( 0, bytesRead ) )
    logger.trace( `\x1b[32m[MP4Box]\x1b[37m${JSON.stringify( this.parseMp4Box( buff ))}` )

    return bytesRead
  }

  /**
   * Basic parser of MP4 box. This will parse only 1st layer of box 
   * then return array of type and length.
   * 
   * @snipet
   * ```js
   * this.parseMp4Box( buff ) 
   *   #=> [{"type":"prft","length":32},{"type":"moof","length":220},{"type":"mdat","length":35170}]
   * ```
   * 
   * @param {Buffer} buff 
   * @returns {Array<Object>}
   */
  static parseMp4Box = ( buff ) => {
    let boxStart = 0
    const ret = []

    while ( boxStart < buff.length ) {
      const length = buff.readUInt32BE( boxStart )
      const type = buff.toString( 'ascii', boxStart + 4, boxStart + 8 )
      ret.push({ type, length })
      
      boxStart += length
    }

    return ret
  }

  constructor( props ) {
    super( props )

    if( props && props.port ) {
      this._port = props.port
    }
    this._app = express()
  }

  start() {
    this._app.use( express.static( this._publicDir ) )

    this._setDashHandler()

    this._setErrorHandler()

    this._setWatchListener()

    this._app.listen( this._port, () => {
      logger.info( `start server on port ${this._port}` )
    })
  }

  _setDashHandler() {
    this._app.get( '/dash/:filename', async ( req, res, next ) => {
      const filename = `${this._dashDir}/${req.params.filename}`
      const [ ext ] = req.params.filename.split(".").slice(-1)
      let handler

      try {
        handler = await open( filename )
          .catch( () => null )

        if( handler ) {
          // case file exists. send data via regular http response
          res.setHeader('Content-Type', getContentType( ext ))

          const bytesRead = await this.constructor.readThenSend( handler, res, 0 )
          handler.close()

          res.end()

          logger.info(`GET - ${req.url} (${bytesRead})`)
        } else {
          // case when file not exists, there maybe tmp file. When tmp file exists,
          // we will send it via http chunked-transfer way.
          // otherwise, throw 404
          const tmpFile = `${filename}.tmp`
          const [ _tmpFile ] = tmpFile.split("/").slice( -1 )
          handler = await open( tmpFile )
            .catch( () => { throw new HttpError( `NOT FOUND - ${req.url}`, 404 )})

          res.setHeader('Content-Type', getContentType( ext ))

          let pos = 0

          // send first chunk
          // todo - create function for read data then write
          //      - check mp4 box
          const bytesRead = await this.constructor.readThenSend( handler, res, pos )

          pos += bytesRead

          logger.trace( `\x1b[36m[${_tmpFile}]\x1b[37m - sent: ${bytesRead}, total: ${pos}` )

          // set abort controller, since sometimes `rename` will not emitted
          // when filename changed.
          const ac = new AbortController()
          const { signal } = ac
          const timer = setTimeout( () => {
            logger.warn('\x1b[35mtimeout detected\x1b[37m')
            ac.abort()
          }, 5000 )

          // When ${_filename}.tmp change to ${_filename}.m4s, event
          // `rename:${_filename}` will be emitted. When we detect this
          // event, we will stop file watcher using `ac.abort()`.
          const _filename = req.params.filename
          this.once(`rename:${_filename}`, () => {
            logger.debug(`\x1b[32m[rename detected]\x1b[37m - ${_filename}`)
            clearTimeout( timer )
            ac.abort()
          })

          // start watcher for tmp file.
          const watcher = watch( tmpFile, { persistent: true, recursive: false, signal } )

          try {
            for await( const event of watcher ) {
              if( event.eventType === "change" ) {
                // in case when file changed, read added data then write it 
                // as chunked-transfer
                const bytesRead = await this.constructor.readThenSend( handler, res, pos )
                pos += bytesRead

                logger.trace( `\x1b[36m[${_tmpFile}]\x1b[37m - sent: ${bytesRead}, total: ${pos}` )
              } else if( event.eventType === 'rename') {
                // noop
              }
            }
          } catch(err) {
            if ( err.name === 'AbortError' ) {
              // do nothing
            } else {
              throw err
            }
          }

          // finish chunked-transfer
          handler.close()
          res.end()

          logger.info(`GET - ${req.url} (${pos})`)
        }
      } catch(err) {
        if( handler ) handler.close()
        next( err )
      }
    })
  }

  _setErrorHandler() {
    const logErrors = ( err, req, res, next ) => {
      logger.error( `\x1b[31m${err.status} \x1b[33m${err.stack}\x1b[37m` )
      next( err )
    }

    const errorHandler = ( err, req, res, next ) => {
      if( res.headersSent ) {
        return next( err )
      }

      res.status( err.status || 500 )
      res.send( err.message )
    }

    this._app.use( logErrors )
    this._app.use( errorHandler )
  }

  _setWatchListener() {
    watchCallback( this._dashDir, ( eventType, filename ) => {
      if( filename.match(/.+\.m4s$/) ) {
        this.emit( `${eventType}:${filename}` )
      }
    })
  }
}
