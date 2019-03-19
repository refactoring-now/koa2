module.exports = {
  set etag(val) {
    if (!/^(W\/)?"/.test(val)) val = `"${val}"`;
    this.set('ETag', val);
  },

  get etag() {
    return this.get('ETag');
  }
};
