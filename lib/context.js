// node 原生包
const util = require('../npm/util');
// 这是
const createError = require('../npm/http-errors');
const httpAssert = require('../npm/http-assert');
const delegate = require('../npm/delegates');
const statuses = require('../npm/statuses/statuses');
const Cookies = require('../npm/cookies/index');

// 全局变量用 Symbol
const COOKIES = Symbol('context#cookies');

const proto = (module.exports = {
  inspect() {
    // singleton
    if (this === proto) return this;
    return this.toJSON();
  },

  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket'
    };
  },

  // 断言
  assert: httpAssert,

  // 抛出异常
  throw(...args) {
    // 处理异常 -- 抽象出来了
    throw createError(...args);
  },

  // 错误处理
  onerror(err) {
    if (null == err) return;

    if (!(err instanceof Error)) { err = new Error(util.format('non-error thrown: %j', err)); }

    let headerSent = false;

    if (this.headerSent || !this.writeble) {
      headerSent = err.headerSent = true;
    }

    this.app.emit('error', err, this);

    if (headerSent) {
      return;
    }

    const { res } = this;

    // 不设置任何 headers
    if (typeof res.getHeaderNames === 'function') {
      res.getHeaderNames().forEach(name => {
        res.removeHeader(name);
      });
    }

    // 设置 headers
    this.set(err.headers);

    // 设置 type 为 text
    this.type = 'text';

    if ('ENOENT' == err.code) err.status = 404;

    if ('number' != typeof err.status || !statuses[err.status]) err.status = 500;

    const code = statuses[err.status];
    const msg = err.expose ? err.message : code;
    this.status = err.status;
    // 设置 length 为字节长
    this.length = Buffer.byteLength(msg);
    // 返回
    res.end(msg);
  },

  // 获取 cookies
  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }

    return this[COOKIES];
  },

  // 设置 cookies
  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  }
});

if (util.inspect.custom) {
  module.exports[util.inspect.custom] = module.exports.inspect;
}

// 委托模式
delegate(proto, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('set')
  .method('append')
  .method('flushHeaders')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable');

// 委托模式
delegate(proto, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .access('accept')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('URL')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip');
