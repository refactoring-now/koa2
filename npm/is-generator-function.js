'use strict';

// 减少查找引用，优化代码
var toStr = Object.prototype.toString;
// 函数转换成字符串的
var fnToStr = Function.prototype.toString;
// 判断是不是 *function 函数的正则
var isFnRegex = /^\s*(?:function)?\*/;

var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

// 返回给定对象的原型，如果没有继承属性，那就返回null
var getProto = Object.getPrototypeOf;

var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};

var generatorFunc = getGeneratorFunc();

var GeneratorFunction = generatorFunc ? getProto(generatorFunc) : {};


module.exports = function isGeneratorFunction(fn) {
  // 如果不是函数就直接返回 false
	if (typeof fn !== 'function') {
		return false;
  }

  // 如果是 *funtion 就返回true
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
  }

  // 看看有没有 如果是自己创建的类 就没有 toStrinngTag 标签
  // 没有的话就自己返回
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
  }

  // 如果都没有匹配，那就
	return getProto(fn) === GeneratorFunction;
};
