var _ = require('underscore');

var parseInput = function (input) {
  if (!_.isString(input)) {
    input = JSON.stringify(input);
  }
  return input;
};

var Activity = module.exports = function (client, taskToken, input) {
  this._client = client;
  this._taskToken = taskToken;

  this.input = parseInput(input);
};

Activity.prototype.heartbeat = function (data) {
  return this._client.recordActivityTaskHeartbeatAsync({
    taskToken: this._taskToken,
    details: parseInput(data)
  });
};

Activity.prototype.done = function (result) {
  return this._client.respondActivityTaskCompletedAsync({
    result: parseInput(result),
    taskToken: this._taskToken
  });
};

Activity.prototype.error = function (err, details) {
  return this._client.respondActivityTaskFailedAsync({
    reason: err.message,
    details: parseInput(details),
    taskToken: this._taskToken
  });
};
