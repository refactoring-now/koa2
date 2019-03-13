# koa2
简易版 类 koa 框架

## 具体特性

- 使用 use 方法加载中间件
- 中间件的执行顺序为use加载的顺序
- 使用 req 和 res ，不用ctx
- 先不使用next，通过res.end来结束调用链


## 目前要做的事情

- 分析 koa 源码