import Server from './libs/server.js'

const server = Server.create( { port: 5000 })
server.start()