var util = require('util');
var Poller = require('../utils/poller');
var _ = require('underscore');
var Activity = require('./activity');

var Worker = module.exports = function (client, config) {
  this._config = config;
  Poller.call(this, client, config);

  this._pollMethod = 'pollForActivityTask';

  this._actors = {};
};

util.inherits(Worker, Poller);

Worker.prototype._handleTask = function (data) {
  console.log('Activity task received');
  var activityId = data.activityId;

  if (this._actors[activityId]) {
    var activity = new Activity(this._client, data.taskToken);
    this._actors[activityId].handle(activity);
  }
};

Worker.prototype.register = function (name, actor) {
  if (this._actors[name]) {
    throw new Error('Already registered actor for activity ' + name);
  }

  if (!_.isFunction(actor.handle)) {
    throw new Error('Invalid actor (must have "handle" function)');
  }

  this._actors[name] = actor;
};

module.exports = Worker;
