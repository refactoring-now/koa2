// node 自带包
const URL = require('url').URL;
// node 自带包
const net = require('net');
const accepts = require('../npm/accepts');
const contentType = require('../npm/content-type');
// node 自带包
const stringify = require('url').format;
const parse = require('../npm/parseUrl');
// node 自带包
const qs = require('querystring');
const typeis = require('../npm/type-is');
const fresh = require('../npm/fresh');
const only = require('../npm/only');
// node 自带包
const util = require('util');

// 用到了 Symbol 避免变量污染
// 这里使用了全局变量，所以最好使用 Symbol 进行处理
const IP = Symbol('context#ip');

module.exports = {

  // 获取请求头 -- 对象
  // { 'content-length': '123',
  // 'content-type': 'text/plain',
  // 'connection': 'keep-alive',
  // 'host': 'xxx.com',
  // 'accept': '*/*' }
  get header() {
    return this.req.headers;
  },

  set header(val) {
    this.req.headers = val;
  },

  // 获取请求的url -- 字符串
  get url() {
    return this.req.url;
  },

  set url(val) {
    this.req.url = val;
  },

  // 设置白名单
  toJSON() {
    return only(this, [
      'method',
      'url',
      'header'
    ]);
  },

  // 返回请求的原始 url
  get origin() {
    return `${this.protocol}://${this.host}`;
  },

  // 返回请求的原始 href
  get href() {
    // 正则
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl;
    return this.origin + this.originalUrl;
  },

  // 获取请求方法
  get method() {
    return this.req.method;
  },

  set method(val) {
    this.req.method = val;
  },

  // 获取指定偏移量的子域，返回成数组形式
  get subdomains() {
    const offset = this.app.subdomainOffset;
    const hostname = this.hostname;
    if (net.isIP(hostname)) return [];
    return hostname
      .split('.')
      .reverse()
      .slice(offset);
  },

  // 获取 charset
  get charset() {
    try {
      const { parameters } = contentType.parse(this.req);
      return parameters.charset || '';
    } catch (e) {
      return '';
    }
  },

  // 检查给定的可接受的文本类型
  get accept() {
    return this._accept || (this._accept = accepts(this.req));
  },

  // 获取 目录路径 pathname: '/status',
  get path() {
    return parse(this.req).pathname;
  },

  set path(path) {
    const url = parse(this.req);
    if (url.pathname === path) return;

    url.pathname = this.path;
    url.path = null;

    this.url = stringify(url);
  },

  // 获取指定的查询字符的值
  get query() {
    const str = this.querystring;
    const c = this._querycache = this._querycache || {};
    return c[str] || (c[str] = qs.parse(str));
  },

  // 设置查询字符串
  set query(obj) {
    this.querystring = qs.stringify(obj);
  },

  // 获取请求的 querystring 对象
  get querystring() {
    if (!this.req) return '';
    return parse(this.req).query || '';
  },

  set querystring(str) {
    const url = parse(this.req);
    if (url.search === `?${str}`) return;

    url.search = str;
    url.path = null;

    this.url = stringify(url);
  },

  // 获取search: '?name=godkun',  ?后面
  get search() {
    if (!this.querystring) return '';
    return `?${this.querystring}`;
  },

  set search(str) {
    this.querystring = str;
  },

  // 监督
  inspect() {
    if (!this.req) return;
    return this.toJSON();
  },

  // 使用请求和响应 头字段 来检查响应的新鲜度。
  // true返回时，客户端缓存中的响应仍为“新鲜” ，false表示已过时且应发送完整响应。
  //
  get fresh() {
    const method = this.method;
    const s = this.ctx.status;

    // 不是 get head 就返回 false
    if ('GET' != method && 'HEAD' != method) return false;

    // 2xx or 304 as per rfc2616 14.26
    // 刷新内容
    if ((s >= 200 && s < 300) || 304 == s) {
      return fresh(this.header, this.response.header);
    }

    return false;
  },

  // X-Forwarded-Host 可以用来确定哪一个域名是最初被用来访问的。隐私问题
  get host() {
    const proxy = this.app.proxy;
    let host = proxy && this.get('X-Forwarded-Host');
    if (!host) {
      if (this.req.httpVersionMajor >= 2) host = this.get(':authority');
      if (!host) host = this.get('Host');
    }
    if (!host) return '';
    return host.split(/\s*,\s*/)[0];
  },

  // 获取 去掉端口号的 hostname
  get hostname() {
    const host = this.host;
    if (!host) return '';
    // 如果 host 是数组，就返回 this.URL.hostname
    if ('[' == host[0]) return this.URL.hostname || ''; // IPv6
    return host.split(':')[0];
  },

  // 获取 url
  get URL() {
    /* istanbul ignore else */
    if (!this.memoizedURL) {
      const protocol = this.protocol;
      const host = this.host;
      const originalUrl = this.originalUrl || ''; // avoid undefined in template string
      try {
        this.memoizedURL = new URL(`${protocol}://${host}${originalUrl}`);
      } catch (err) {
        this.memoizedURL = Object.create(null);
      }
    }
    return this.memoizedURL;
  },

  // 获取协议:  https || http

  get protocol() {
    if (this.socket.encrypted) return 'https';
    if (!this.app.proxy) return 'http';
    // X-Forwarded-Proto: 用于识别协议（HTTP或HTTPS）
    const proto = this.get('X-Forwarded-Proto');
    return proto ? proto.split(/\s*,\s*/)[0] : 'http';
  },

  // 获取代理的ip
  get ips() {
    const proxy = this.app.proxy;
    const val = this.get('X-Forwarded-For');
    return proxy && val
      ? val.split(/\s*,\s*/)
      : [];
  },

  // 获取 ip
  get ip() {
    if (!this[IP]) {
      // 没有的话就获取 this.socket.remoteAddress
      this[IP] = this.ips[0] || this.socket.remoteAddress || '';
    }
    return this[IP];
  },

  set ip(_ip) {
    this[IP] = _ip;
  },

  // is 工具
  is(types) {
    // 如果不存在
    if (!types) return typeis(this.req);
    // 如果不是数组 就通过 [].slice.call(arguments) 使其变成数组
    if (!Array.isArray(types)) types = [].slice.call(arguments);
    // 然后返回 typeis
    return typeis(this.req, types);
  },

  // 获取 Content-Type 的值
  get type() {
    const type = this.get('Content-Type');
    if (!type) return '';
    return type.split(';')[0];
  }

};

if (util.inspect.custom) {
  module.exports[util.inspect.custom] = module.exports.inspect;
}
