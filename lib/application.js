const onFinished = require('../npm/on-finished');

const response = require('./response');

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

module.exports = class Application extends Emitter {
  constructor() {
    // 继承 Emitter 方法
    super();
    // 存放中间件的数组
    this.middleware = [];
    // 子域偏移量
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
    // 不是函数，就抛出异常
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
    // 组合函数
    const fn = compose(this.middleware);

    // 这种写法很好玩，首先函数名相同，handleRequest 既是callback 中的 变量名字 也是类中的实例方法的函数名字
    const handleRequest = (req, res) => {
      // 创造上下文
      const ctx = this.createContext(req, res);
      // 递归调用 将上下文 ctx 传入 handleRequest
      return this.handleRequest(ctx, fn);
    };
    // 返回处理请求函数 可以看成如下代码：
    // let server = http.createServer((req, res) => {
    //   const ctx = this.createContext(req, res);
    //   return this.handleRequest(ctx, fn);
    // });
    return handleRequest;
  }

  // 返回包含 只包含 ['proxy', 'env', 'subdomainOffset']  的对象白名单
  // 这块为什么叫 toJSON 我不明白
  // app.env 默认是 NODE_ENV 或者 'development'
  // app.proxy 当设置为 true 时，表示 porxy 头部将被信任
  // app.subdomainOffset 设置.subdomains 的偏移量。
  toJSON() {
    return only(this, [
      'subdomainOffset',
      'proxy',
      'env'
    ]);
  }

  // 监督
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
    // 监听信息完成
    onFinished(res, onerror);
    // 优雅的写法
    // 中间件的每一次执行，都会发挥一个promise对象，然后把结果传递给 handleResponse 函数
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }

  // 创建上下文 将一系列对象挂载到一个上下文对象上
  createContext(req, res) {

    const context = Object.create(this.context);
    // 代理的思想
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);

    // 挂载 app req res
    // let app = new Koa()  app.context.app/req/res
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
  onerror(err) {
    // 如果不是 Error 实例 那就抛出一个异常
    if (!(err instanceof Error)) throw new TypeError(util.format('non-error thrown: %j', err));
    // 为了软匹配 使用了双等
    if (404 == err.status || err.expose) return;
    // 如果 silent 为 true 那就不启用错误处理
    // 我们需要自己去监听错误
    if (this.silent) return;
    // 错误信息
    const msg = err.stack || err.toString();
    console.error(msg.replace(/^/gm, '  '));
  }
};

/**
 * 返回处理
 */
function respond(ctx) {
  if (false === ctx.respond) return;

  const res = ctx.res;
  if (!ctx.writable) return;

  let body = ctx.body;
  const code = ctx.status;

  // 如果状态 code(304 ...) 是空，那就不返回 body
  // 看 statuses 实现的话，会发现这个写法太骚了
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
  if ('string' == typeof (body)) return res.end(body);
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
