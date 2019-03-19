const util = require('util');
const createError = require('http-errors');
const httpAssert = require('http-assert');
const delegate = require('delegates');
const statuses = require('statuses');
const Cookies = require('cookies');

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

  assert: httpAssert,

  throw(...args) {
    throw createError(...args);
  },

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

    this.set(err.headers);

    this.type = 'text';

    if ('ENOENT' == err.code) err.status = 404;

    if ('number' != typeof err.status || !statuses[err.status]) err.status = 500;

    const code = statuses[err.status];
    const msg = err.expose ? err.message : code;
    this.status = err.status;
    this.length = Buffer.byteLength(msg);
    res.end(msg);
  },

  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }

    return this[COOKIES];
  },

  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  }
});

if (util.inspect.custom) {
  module.exports[util.inspect.custom] = module.exports.inspect;
}

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
