var util = require('util');

var RetryStrategy = function() {};
RetryStrategy.prototype.shouldRetry = function(numberOfFailures) {
  return numberOfFailures < this._retryLimit;
};

RetryStrategy.prototype.getBackoffTime = function() {
  return 0;
};

var ExponentialBackoff = function(startAt, retryLimit) {
  this._startAt = startAt;
  this._retryLimit = retryLimit;
};

util.inherits(ExponentialBackoff, RetryStrategy);

ExponentialBackoff.prototype.getBackoffTime = function(numberOfFailures) {
  return Math.pow(this._startAt, numberOfFailures);
};


var ConstantBackoff = function(backoff, retryLimit) {
  this._backoff = backoff;
  this._retryLimit = retryLimit;
};

util.inherits(ConstantBackoff, RetryStrategy);

ConstantBackoff.prototype.getBackoffTime = function() {
  return this._backoff;
};


var Immediate = function(retryLimit) {
  this._retryLimit = retryLimit;
};
util.inherits(Immediate, RetryStrategy);

Immediate.prototype.getBackoffTime = function() {
  return 0;
};


var None = function() {};
util.inherits(None, RetryStrategy);

None.prototype.shouldRetry = function() {
  return false;
};


module.exports = {
  ExponentialBackoff: ExponentialBackoff,
  ConstantBackoff: ConstantBackoff,
  Immediate: Immediate,
  None: None
};
