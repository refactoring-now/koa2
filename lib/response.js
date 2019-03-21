const contentDisposition = require('content-disposition');
const ensureErrorHandler = require('../npm/error-inject');
const getType = require('cache-content-type');
const onFinish = require('on-finished');
const isJSON = require('koa-is-json');
const escape = require('escape-html');
const typeis = require('type-is').is;
const statuses = require('statuses');
const destroy = require('../npm/destroy');
const extname = require('path').extname;
const vary = require('../npm/vary');
const only = require('only');
module.exports = {

  // 返回 socket
  get socket() {
    return this.res.socket;
  },

  // 响应头
  get header() {
    const { res } = this;
    return res.getHeaders();
  },

  // alias
  get headers() {
    return this.header;
  },

  // 返回状态码
  get status() {
    return this.res.statusCode;
  },

  // 设置 状态码
  set status(code) {
    // 如果是 socket 就返回空
    if (this.headerSent) return;

    this._explicitStatus = true;
    this.res.statusCode = true;

    if (this.req.httpVersionMajor < 2) {
      this.res.statusMessage = statuses[code];
    }

    // 如果code是空，那就把 body 设置为 null
    if (this.body && statuses.empty[code]) {
      this.body = null;
    }
  },

  // Content-Disposition 属性是作为对下载文件的一个标识字段
  attachment(filename, options) {
    if (filename) this.type = extname(filename);
    this.set('Content-Disposition', contentDisposition(filename, options));
  },

  // 返回状态信息，没有信息就返回状态码
  get message() {
    return this.res.statusMessage || statuses[this.status];
  },

  // 设置状态信息
  set message(msg) {
    this.res.statusMessage = msg;
  },

  // 返回 body
  get body() {
    return this._body;
  },

  // 设置响应头
  set body(val) {
    // 原始的 body
    const original = this._body;
    // 将 val 传给 _body
    this._body = val;

    // 如果没有内容
    if (null == val) {
      if (!statuses.empty[this.status]) {
        this.status = 204;
      }
      this.remove('Content-Type');
      this.remove('Content-Length');
      this.remove('Transfer-Encoding');
      return;
    }

    if (!this._explicitStatus) {
      this.status = 200;
    }

    // 当没有设置 content-type 的时候 标志位 true
    const setType = !this.header['content-type'];

    // 字符串形式
    if ('string' == typeof val) {
      if (setType) {
        this.type = /^\s*</.test(val) ? 'html' : 'text';
      }
      this.length = Buffer.byteLength(val);
      return;
    }

    // buffer 形式
    if (Buffer.isBuffer(val)) {
      if (setType) this.type = 'bin';
      this.length = val.length;
      return;
    }

    // 流形式
    if ('function' == typeof val.pipe) {
      onFinish(this.res, destroy.bind(null, val));
      // 对流数据进行监听
      ensureErrorHandler(val, err => this.ctx.onerror(err));

      // 覆盖掉以前的 Content-Length
      if (null != original && original != val) this.remove('Content-Length');

      if (setType) this.type = 'bin';
      return;
    }

    this.remove('Content-Length');
    this.type = 'json';
  },

  // 设置 Content-Length
  set length(n) {
    this.set('Content-Length', n);
  },

  // 返回响应的 Content-Length 值
  get length() {
    const len = this.header['content-length'];
    const body = this.body;

    if (null == len) {
      if (!body) return;
      if ('string' == typeof body) return Buffer.byteLength(body);
      if (Buffer.isBuffer(body)) return body.length;
      if (isJSON(body)) return Buffer.byteLength(JSON.stringify(body));
      return;
    }

    return ~~len;
  },

  // 将传入的字段添加到指定的Vary响应头中
  vary(field) {
    if (this.headerSent) return;
    vary(this.res, field);
  },

  // 检查头是否已经写入socket
  get headerSent() {
    return this.res.headersSent;
  },

  // 重定向功能
  redirect(url, alt) {
    // location
    if ('back' == url) url = this.ctx.get('Referrer') || alt || '/';
    this.set('Location', url);

    // status
    if (!statuses.redirect[this.status]) this.status = 302;

    // html
    if (this.ctx.accepts('html')) {
      // 将 url 进行转义
      url = escape(url);
      this.type = 'text/html; charset=utf-8';
      this.body = `Redirecting to <a href="${url}">${url}</a>.`;
      return;
    }

    // text
    this.type = 'text/plain; charset=utf-8';
    this.body = `Redirecting to ${url}.`;
  },

  // 服务端设置 lastModified
  set lastModified(val) {
    if ('string' == typeof val) val = new Date(val);
    this.set('Last-Modified', val.toUTCString());
  },

  // 如果存在，转化成日期模式
  get lastModified() {
    const date = this.get('last-modified');
    if (date) return new Date(date);
  },

  // 设置 etag
  set etag(val) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  },

  get etag() {
    return this.get('ETag');
  },

  // 返回 Content-Type 的值
  get type() {
    const type = this.get('Content-Type');
    if (!type) return '';
    return type.split(';')[0];
  },

  // 设置 Content-Type 的值
  set type(type) {
    // 结果会缓存
    type = getType(type);
    if (type) {
      this.set('Content-Type', type);
    } else {
      // 没有就删除 Content-Type 字段
      this.remove('Content-Type');
    }
  },

  is(types) {
    const type = this.type;
    if (!types) return type || false;
    if (!Array.isArray(types)) types = [].slice.call(arguments);
    return typeis(type, types);
  },

  // 监督
  inspect() {
    if (!this.res) return;
    const o = this.toJSON();
    o.body = this.body;
    return o;
  },

  toJSON() {
    return only(this, [
      'status',
      'message',
      'header'
    ]);
  }
};
