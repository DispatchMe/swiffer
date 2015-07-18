var util = require('util');
var Poller = require('../utils/poller');
var _ = require('underscore');
var Activity = require('./activity');

var Worker = function(client, config) {
  this._config = config;
  Poller.call(this, client, config);

  this._pollMethod = 'pollForActivityTask';

  this._responders = {};
};

util.inherits(Worker, Poller);

Worker.prototype._handleTask = function(data) {
  console.log('Activity task received');
  var activityId = data.activityId;

  if (this._responders[activityId]) {
    var activity = new Activity(this._client, data.taskToken);
    this._responders[activityId].handle(activity);
  }
};

Worker.prototype.registerResponder = function(name, responder) {
  if (this._responders[name]) {
    throw new Error('Already registered responder for activity ' + name);
  }

  if (!_.isFunction(responder.handle)) {
    throw new Error('Invalid responder (must have "handle" function)');
  }

  this._responders[name] = responder;
};

module.exports = Worker;
