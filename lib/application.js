// TODO:
const isGeneratorFunction = require('is-generator-function');

const onFinished = require('../npm/on-finished');

const response = require('./response');

// TODO: 重点看 compose 的实现
const compose = require('../npm/compose');

const isJSON = require('../npm/koa-is-json');

const context = require('./context');

const request = require('./request');

const statuses = require('../npm/statuses/statuses');

const Emitter = require('../npm/events');

const util = require('../npm/util');

const Stream = require('stream');

const http = require('http');

const only = require('../npm/only');
// TODO: 待分析
const convert = require('koa-convert');

// const deprecate = require('depd')('koa');

module.exports = class Application extends Emitter {
  constructor() {
    // 继承 Emitter 方法
    super();
    // 存放中间件的数组
    this.middleware = [];
    // TODO: 待分析
    this.subdomainOffset = 2;
    // 判断环境
    this.env = process.env.NODE_ENV || 'development';
    // 通过 create 方法创建副本
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
    // TODO: 待分析
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect;
    }
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
    // 将中间件装入数组中，JS数组也相当于栈结构
    this.middleware.push(fn);
    // 链式写法
    return this;
  }

  /**
   * CreateServer callback
   *
   * @return {Function}
   */
  callback() {
    const fn = compose(this.middleware);
    const handleRequest = (req, res) => {
      //
      const ctx = this.createContext(req, res);
      // 递归调用
      return this.handleRequest(ctx, fn);
    };
    // 返回处理请求函数 可以看成如下代码：
    // let server = http.createServer((req, res) => {
    //   const ctx = this.createContext(req, res);
    //   return this.handleRequest(ctx, fn);
    // });
    return handleRequest;
  }

  // TODO: 待分析
  toJSON() {
    return only(this, [
      'subdomainOffset',
      'proxy',
      'env'
    ]);
  }

  // TODO: 待分析
  inspect() {
    return this.toJSON();
  }


  handleRequest(ctx, fnMiddleware) {
    // 直接赋值
    const res = ctx.res;
    // 初始值设置为 404
    res.statusCode = 404;
    // 将一个函数赋值给变量 onerror
    const onerror = err => ctx.onerror(err);
    // 将一个函数赋值给变量 handleResponse
    const handleResponse = () => respond(ctx);
    // 这一层进行了函数抽象
    // TODO: 待分析
    onFinished(res, onerror);
    // TODO: 待分析
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  // 创建上下文 将一系列对象挂载到一个上下文对象上
  createContext(req, res) {
    const context = Object.create(this.context);
    // 代理的思想
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    // ?: 疑问
    request.response = response;
    response.request = request;
    // 设置原始 url
    context.originalUrl = request.originalUrl = req.url;
    // 初始化 state
    context.state = {};
    return context;
  }

  // 监听错误
  onerror() {
    // 如果不是 Error 实例 那就抛出一个异常
    if (!(err instanceof Error)) throw new TypeError(util.format('non-error thrown: %j', err));
    // 为了软匹配 使用了双等
    if ( 404 == err.status || err.expose) return;
    // TODO: 待分析
    if (this.silent) return;
    const msg = err.stack || err.toString();
    console.error(msg.replace(/^/gm, '  '));
  }
};

/**
 * 返回处理
 */
respond(ctx) {
  if (false === ctx.respond) return;

  const res = ctx.res;
  if (!ctx.writable) return;

  let body = ctx.body;
  const code = ctx.status;

  // 如果状态 code 是空，那就忽略 body
  // 这个写法太骚了
  if (statuses.empty[code]) {
    ctx.body = null;
    return res.end();
  }

  // 处理 HEAD 方法
  if ('HEAD' == ctx.method) {
    if (!res.headersSent && isJSON(body)) {
      ctx.length = Buffer.byteLength(JSON.stringify(body))
    }
    return res.end()
  }

  // 处理 body 是 null 的情况
  if (null == body) {
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code)
    } else {
      //
      body = ctx.message || String(code)
    }
    // 如果不存在 headersSent
    if (!res.headersSent) {
      ctx.type = 'text';
      // 计算字节长度
      ctx.length = Buffer.byteLength(body);
      return res.end(body)
    }

  }

  /**
   * 下面是根据body数据的不同形式来进行响应的返回
   */
  // 是 Buffer 就直接返回
  if (Buffer.isBuffer(body)) return res.end(body);
  // 是 String 就直接返回
  if ('string' == typeof(body)) return res.end(body);
  // 是 Stream 就返回 pipe 化
  if (body instanceof Stream) return body.pipe(body);

  // body 是 json格式
  body = JSON.stringify(body);
  // TODO: 待分析
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
