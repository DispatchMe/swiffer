var _ = require('underscore');
var Future = require('fibers/future');

var parseInput = function (input) {
  if (!_.isString(input)) {
    input = JSON.stringify(input);
  }
  return input;
};

var Activity = module.exports = function (client, taskToken, input) {
  this._client = Future.wrap(client);
  this._taskToken = taskToken;

  this.input = parseInput(input);
};

Activity.prototype.heartbeat = function (data) {
  return this._client.recordActivityTaskHeartbeatFuture({
    taskToken: this._taskToken,
    details: parseInput(data)
  }).wait();
}.future();

Activity.prototype.done = function (result) {
  return this._client.respondActivityTaskCompletedFuture({
    result: parseInput(result),
    taskToken: this._taskToken
  }).wait();
}.future();

Activity.prototype.error = function (err, details) {
  return this._client.respondActivityTaskFailedFuture({
    reason: err.message,
    details: parseInput(details),
    taskToken: this._taskToken
  }).wait();
}.future();
