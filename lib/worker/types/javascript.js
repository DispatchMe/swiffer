var JavascriptResponder = module.exports = function(func) {
  this._func = func;
};

JavascriptResponder.prototype.handle = function(activity) {
  this._func.call(activity);
};
