var Inline = module.exports = function (func) {
  this._func = func;
};

Inline.prototype.handle = function (activity) {
  try {
    this._func.call(activity);
  } catch (err) {
    activity.error(err.message);
  }
};
