const debug = require('debug')('koa:application')
const Emitter = require('events')


module.exports = class Application extends Emitter {


  constructor() {
    super()
    this.middleware = []
  }

  /**
   * 监听函数
   * @param  {...any} args
   */
  listen(...args) {
    debug('listen')
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }






}
