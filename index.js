import Server from './libs/server.js'

const port = process.env.PORT || 5000
const logLevel = process.env.LOG_LEVEL || 'info'

const server = Server.create( { port, logLevel })
server.start()
