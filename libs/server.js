import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { open, stat } from 'fs/promises'

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
      console.log( ext, filename )
      let handler
      const buff = new Buffer( 1000000 )
      
      try {
        handler = await open( filename )
        const { size } = await handler.stat()

        const { bytesRead, buffer } = await handler.read( buff, 0, size, 0 )

        handler.close()
        res.setHeader('Content-Type', getContentType( ext ))
        res.send( buff.slice( 0, size ) )
      } catch(err) {
        if( handler ) handler.close()

        const tmpFile = filename + ".tmp"
        const { size }= await stat( filename + ".tmp" )
          .catch( err => console.error( err.message ))
        
        console.log( `=== ${size} ${tmpFile.split("/").slice(-1)[0]} ===` )


        next( err )
      }
    })
  }

  _setErrorHandler() {
    const logErrors = ( err, req, res, next ) => {
      console.error( err.stack )
      next( err )
    }
    
    const errorHandler = ( err, req, res, next ) => {
      if( res.headersSent ) {
        return next( err )
      }

      const code = err.message.includes("no such file or directory") ? 404 : 500
      res.status( code )
      res.send( err.message )
    }

    this._app.use( logErrors )
    this._app.use( errorHandler )
  }
}