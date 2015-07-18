var Promise = require('bluebird');

var AWSLambdaResponder = module.exports = function (client, functionName) {
  this._client = client;
  if (!this._client.createFunctionPromise) {
    this._client = Promise.promisifyAll(this._client, {
      suffix: 'Promise'
    });
  }

  this._functionName = functionName;
};

AWSLambdaResponder.prototype.handle = function (activity) {
  this._client.invokePromise({
    FunctionName: this._functionName,
    Payload: activity.input
  }).then(function (result) {
    activity.done(result);
  }).error(activity.error).done();
};
