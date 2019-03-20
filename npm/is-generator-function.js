'use strict';

var toStr = Object.prototype.toString;
// 函数转换成字符串的
var fnToStr = Function.prototype.toString;
// 判断是不是函数的正则
var isFnRegex = /^\s*(?:function)?\*/;

var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

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


/**
 * TODO: 待分析
 * @param {*} fn
 */
module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
  }

	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}

  if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
  }

	return getProto(fn) === GeneratorFunction;
};
