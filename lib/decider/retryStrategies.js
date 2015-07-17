var extend = require('../utils/extend');
var RetryStrategy, ExponentialBackoff, LinearBackoff, Immediate, None;

RetryStrategy = (function() {
  RetryStrategy = function() {};
  RetryStrategy.prototype.shouldRetry = function(numberOfFailures) {
    return numberOfFailures < this._retryLimit;
  };
  return RetryStrategy;
})();

ExponentialBackoff = (function(superclass) {
  ExponentialBackoff = function(startAt, retryLimit) {
    this._startAt = startAt;
    this._retryLimit = retryLimit;
  };


  extend(ExponentialBackoff, superclass);


  ExponentialBackoff.prototype.getBackoffTime = function(numberOfFailures) {
    return Math.pow(this._startAt, numberOfFailures);
  };
  return ExponentialBackoff;
})(RetryStrategy);

LinearBackoff = (function(superclass) {
  LinearBackoff = function(backoff, retryLimit) {
    this._backoff = backoff;
    this._retryLimit = retryLimit;
  };

  extend(LinearBackoff, superclass);



  LinearBackoff.prototype.getBackoffTime = function() {
    return this._backoff;
  };
  return LinearBackoff;
})(RetryStrategy);


Immediate = (function(superclass) {
  Immediate = function(retryLimit) {
    this._retryLimit = retryLimit;
  };

  extend(Immediate, superclass);



  Immediate.prototype.getBackoffTime = function() {
    return 0;
  };
  return Immediate;
})(RetryStrategy);

None = function() {};
None.prototype.shouldRetry = function() {
  return false;
};


module.exports = {
  ExponentialBackoff: ExponentialBackoff,
  LinearBackoff: LinearBackoff,
  Immediate: Immediate,
  None: None
};
