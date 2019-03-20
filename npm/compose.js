'use strict'
module.exports = compose
/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */

function compose (middleware) {
  // 判断是否是数组
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  // 对数组进行 for of 迭代
  for (const fn of middleware) {
    // 保证所有的中间件必须是函数
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    // 标志位，用来启动调度
    let index = -1
    // 调度
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        // next 为 dispatch.bind(null, i + 1)
        // 递归调用 知道next没有，递归结束，从栈顶依次开始出栈
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
