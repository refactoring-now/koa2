module.exports = isJSON;

/**
 * 判断是否是 JSON 格式
 * @param {*} body
 */
function isJSON(body) {
  if (!body) return false;
  if ('string' == typeof body) return false;
  if ('function' == typeof body.pipe) return false;
  if (Buffer.isBuffer(body)) return false;
  return true;
}
