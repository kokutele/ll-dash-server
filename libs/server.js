import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { open, stat, watch } from 'fs/promises'
import { watchFile, unwatchFile } from 'fs'
import chokidar from 'chokidar'

import HttpError from './http-error.js'
import { getContentType } from './util.js'

const __filename = fileURLToPath( import.meta.url )
const __dirname = path.dirname( __filename )

export default class Server {
  _port = 3000
  _publicDir = __dirname + "/../public"
  _dashDir   = __dirname + "/../dash-data"
  _app = null

  static create( { port } ) {
    return new this( { port } )
  }

  constructor( props ) {
    if( props && props.port ) {
      this._port = props.port
    }
    this._app = express()
  }

  start() {
    this._app.use( express.static( this._publicDir ) )

    this._setDashHandler()

    this._setErrorHandler()

    this._app.listen( this._port, () => {
      console.log( `start server on port ${this._port}` )
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
          const { size } = await handler.stat()
            .catch( err => { throw new HttpError( err.message, 500 ) })
          const buff = Buffer.alloc( size )

          const { bytesRead, buffer } = await handler.read( buff, 0, size, 0 )
            .catch( err => { throw new HttpError( err.message, 500 ) })

          handler.close()

          res.setHeader('Content-Type', getContentType( ext ))
          res.send( buff.slice( 0, size ) )

          console.log(`GET - ${req.url} (${size})`)
        } else {
         // case file not exists, there maybe tmp file. When tmp file exists,
          // we will send it via http chunked-transfer way.
          // otherwise, throw 404
          const tmpFile = `${filename}.tmp`
          const [ _tmpFile ] = tmpFile.split("/").slice( -1 )
          handler = await open( tmpFile )
            .catch( err => { throw new HttpError( `NOT FOUND - ${req.url}`, 404 )})

          const buff = Buffer.alloc( 1000000 )

          res.setHeader('Content-Type', getContentType( ext ))
          let pos = 0

          try {
            const { size }= await handler.stat()
            const { bytesRead, buffer } = await handler.read( buff, 0, ( size - pos ), pos )
            res.write( buff.slice( 0, ( size - pos ) ) )

            pos += bytesRead

            console.log( `\x1b[36m[${_tmpFile}]\x1b[37m - sent: ${bytesRead}, total: ${pos}` )

            const watcher = chokidar.watch( tmpFile )

            watcher.on('all', async ( event, path ) => {
              if( event === 'add' || event === 'unlink' ) {
                const { size }= await handler.stat()
                if( size > pos ) {
                  const { bytesRead, buffer } = await handler.read( buff, 0, ( size - pos ), pos )

                  res.write( buff.slice( 0, ( size - pos ) ) )
                  pos += bytesRead
                  console.log( `\x1b[36m[${_tmpFile}]\x1b[37m - sent: ${bytesRead}, total: ${pos}` )
                }

                if ( event === 'unlink' ) {
                  await watcher.close()
                  handler.close()
                  res.end()
                  console.log(`GET - ${req.url} (${pos})`)
                }
              } else {
              }
            })

            // watchFile( tmpFile, ( curr, prev ) => {
            //   console.log(`current mtime ${curr.mtime}`)
            //   console.log(`previous mtime ${prev.mtime}`)
            // })

            // // todo - include abort controller
            // const ac = new AbortController()
            // const { signal } = ac
            // const timer = setTimeout( () => ac.abort(), 10000 )
            // const watcher = watch( tmpFile, { persistent: true, recursive: false, signal } )

            // try {
            //   for await( const event of watcher ) {
            //     console.log( event, tmpFile )
            //     if( event.eventType === "change" ) {
            //       const { size }= await handler.stat()
            //       const { bytesRead, buffer } = await handler.read( buff, 0, ( size - pos ), pos )
            //       console.log( size, bytesRead )

            //       res.write( buff.slice( 0, ( size - pos ) ) )
            //       pos += bytesRead
            //     } else if( event.eventType === 'rename') {
            //       clearTimeout( timer )
            //       break
            //     }
            //   }
            // } catch(err) {
            //   if ( err.name === 'AbortError' ) {
            //     console.log('\x1b[31mabort\x1b[37m')
            //     return
            //   } else {
            //     throw err
            //   }
            // }
          } catch( err ) {
            throw new HttpError( err.message, 500 )
          }

          //console.log('\x1b[36end\x1b[37m')
          //handler.close()
          //res.end()
        }
      } catch(err) {
        if( handler ) handler.close()
        next( err )
      }
    })
  }

  _setErrorHandler() {
    const logErrors = ( err, req, res, next ) => {
      console.error( `\x1b[31m${err.status} \x1b[33m${err.stack}\x1b[37m` )
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
}