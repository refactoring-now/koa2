// TODO:
// const isGeneratorFunction = require('is-generator-function');

const onFinished = require('on-finished');

const response = require('./response');

// TODO: 重点看 compose 的实现
// const compose = require('koa-compose');

// const isJSON = require('koa-is-json');

const context = require('./context');

const request = require('./request');

// const statuses = require('statuses');

const Emitter = require('events');

// const util = require('util');

// const Stream = require('stream');

const http = require('http');

// const only = require('only');
// TODO: 待分析
const convert = require('koa-convert');

// const deprecate = require('depd')('koa');

module.exports = class Application extends Emitter {
  constructor() {
    // 继承 Emitter 方法
    super();
    // 存放中间件的数组
    this.middleware = [];
    // 判断环境
    this.env = process.env.NODE_ENV || 'development';
    // 通过 create 方法创建副本
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
  }

  listen(...args) {
    // 高阶函数
    // 好处：通过将代码看成参数的形式，使其更加灵活
    // 通过工厂模式，来生成对象，隐藏掉 new
    let server = http.createServer(this.callback());
    return server.listen(...args);
  }

  /**
   *
   * Use middleware
   *
   * @param {Function} fn
   */
  ues(fn) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be a function!');
    // TODO: 待分析
    fn = convert(fn);
    // 将中间件装入数组中，JS数组也相当于栈结构
    this.middleware.push(fn);
    // 链式写法
    return this;
  }

  compose(middleware) {
    return function(context, next) {
      let index = -1;
      return dispatch(0);
      function dispatch(i) {
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
    };
  }

  /**
   * CreateServer callback
   *
   * @return {Function}
   */
  callback() {
    const fnMiddleware = this.compose(this.middleware);
    return async (req, res) => {
      // TODO Add error handler
      const context = { req, res };
      await fnMiddleware(context);
      res.end('I am koa 2');
    };
  }

  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    // const handleResponse = () => respond(ctx);
    // 这一层进行了函数抽象
    onFinished(res, onerror);
    // return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  // 创建上下文 将一系列对象挂载到一个上下文对象上
  createContext(req, res) {
    const context = Object.create(this.context);
    const request = (context.request = Object.create(this.request));
    const response = (context.response = Object.create(this.response));
    context.qpp = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    return context;
  }
};
