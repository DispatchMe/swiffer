var InlineResponder = module.exports = function (func) {
  this._func = func;
};

InlineResponder.prototype.handle = function (activity) {
  this._func.call(activity);
};
