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
  console.log('Activity task received', data);

  var keys = [data.activityType.name + ':' + data.activityType.version, data.activityType.name];
  var activity = new Activity(this._client, data.taskToken, data.input);
  for (var i = 0; i < keys.length; i++) {
    if (this._actors[keys[i]]) {

      this._actors[keys[i]].handle(activity);
      return;
    }
  }

  console.log('No handler registered for ' + keys[0]);
  activity.error(new Error('No handler registered for ' + keys[0]));
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
