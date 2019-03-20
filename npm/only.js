/**
 * 返回包含 keys 的 obj 的白名单
 * @param {*} obj
 * @param {*} keys
 */
module.exports = function(obj, keys){
  obj = obj || {};
  if ('string' == typeof keys) keys = keys.split(/ +/);
  // 归约思想
  return keys.reduce(function(ret, key){
    if (null == obj[key]) return ret;
    ret[key] = obj[key];
    return ret;
  }, {});
};
