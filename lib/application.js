const Emitter = require('events')
const http = require('http')

module.exports = class Koa2 extends Emitter {
  constructor() {
    super()
    this.middleware = [];
  }

  ues(fun) {

  }

  // 这是一个中间件的demo
  middle(req, res) {
    res.end('i am koa2')
  }

  listen(port) {
    let server = http.createServer((req, res) => {
      this.middle(req, res)
    })
    return server.listen(port)
  }

}

