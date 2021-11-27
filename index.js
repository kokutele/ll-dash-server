import Server from './libs/server.js'

const port = process.env.PORT || 5000

const server = Server.create( { port: port })
server.start()
