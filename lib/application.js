// TODO:
const isGeneratorFunction = require('is-generator-function')

const debug = require('debug')('koa:application')

const onFinished = require('on-finished')

const response = require('./response')

// TODO: 重点看 compose 的实现
const compose = require('koa-compose')

const isJSON = require('koa-is-json')

const context = require('./context')

const request = require('./request')

const statuses = require('statuses')

const Emitter = require('events')

const util = require('util')

const Stream = require('stream')

const http = require('http')

const only = require('only')
// TODO: 待分析
const convert = require('koa-convert')

const deprecate = require('depd')('koa')

module.exports = class Application extends Emitter {
  constructor() {
    // 继承 Emitter 方法
    super()
    this.middleware = []
    this.env = process.env.NODE_ENV || 'development'
    //创建副本
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)
  }

  /**
   * 监听函数
   * @param  {...any} args
   */
  listen(...args) {
    debug('listen')

    // 高阶函数 看实现
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }

  use(fn) {
    // TODO: 认真分析为什么要这样写
    fn = convert(fn)
    this.middleware.push(fn)
    return this
  }

  callback() {
    // TODO: 认真分析为什么要这样写
    const fn = compose(this.middleware)

    
    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res)
      return this.handleRequest(ctx, fn)
    }
    return handleRequest
  }

  // 创建上下文 将一系列对象挂载到一个上下文对象上
  createContext(req, res) {
    const context = Object.create(this.context)
    const request = (context.request = Object.create(this.request))
    const response = (context.response = Object.create(this.response))
    context.qpp = request.app = Response.app = this
    context.req = request.req = response.req = req
    context.res = request.res = response.res = res
    return context
  }

  // 处理请求
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res
    res.statusCode = 404
  }
}
