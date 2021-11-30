import Server from './libs/server.js'

const port = process.env.PORT || 5000
const logLevel = process.env.LOG_LEVEL || 'info'
const dashDir = process.env.DASH_DIR || null

const server = Server.create( { port, logLevel, dashDir })
server.start()