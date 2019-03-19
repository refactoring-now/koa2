const debug = require('debug')('koa:application')
const Emitter = require('events')


module.exports = class Application extends Emitter {


  constructor() {
    super()
    this.middleware = []
  }

  /**
   *
   * Use middleware
   *
   * @param {*} mw
   */
  ues(mw) {
    if (typeof mw !== 'function') throw new TypeError('Middleware must be a function!');
    // Add middleware
    this.middleware.push(mw);
    return this;
  }

  compose(middleware) {
    return function (context, next) {
      let index = -1;
      return dispatch(0);
      function dispatch (i) {
        // multipled call next() in one middleware
        if (i <= index) {
          return Promise.reject(new Error('next() called multiple times'));
        }
        index = i;
        let fn = middleware[i];
        // ? Why do this ?
        if (i === middleware.length) {
          fn = next;
        }
        if (!fn) {
          return Promise.resolve();
        }
        try {
          // resolve current middleware and prepare next
          return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
        } catch (err) {
          return Promise.reject(err);
        }
      }
    }
  }

  /**
   * CreateServer callback
   *
   * @return {Function}
   */
  callback () {
    const fnMiddleware = this.compose(this.middleware);
    return async (req, res) => {
      // TODO Add error handler
      const context = { req, res };
      await fnMiddleware(context);
      res.end('I am koa 2')
    }
  }

  listen(port) {
    let server = http.createServer(this.callback());
    return server.listen(port);
  }




}
