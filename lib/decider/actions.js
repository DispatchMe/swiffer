var uuid = require('uuid');
var util = require('util');

var ScheduleAction = function (name, input, config) {
  this._name = name;
  this._input = JSON.stringify(input);
  this._activityConfig = config;
};

ScheduleAction.prototype.getDecision = function () {
  return {
    decisionType: 'ScheduleActivityTask',
    scheduleActivityTaskDecisionAttributes: {
      activityId: this._name,
      activityType: {
        name: this._name,
        version: this._activityConfig.version,
      },
      input: this._input,
      scheduleToStartTimeout: this._activityConfig.scheduleToStartTimeout ? this._activityConfig.scheduleToStartTimeout
        .toString() : '60',
      scheduleToCloseTimeout: this._activityConfig.scheduleToCloseTimeout ? this._activityConfig.scheduleToCloseTimeout
        .toString() : '360',
      startToCloseTimeout: this._activityConfig.startToCloseTimeout ?
        this._activityConfig.startToCloseTimeout.toString() : '300',
      heartbeatTimeout: this._activityConfig.heartbeatTimeout ? this._activityConfig.heartbeatTimeout.toString() : '60'

    }
  };
};

var TimerAction = function (name, delay) {
  this._name = name;
  this._delay = delay;
};

TimerAction.prototype.getDecision = function () {
  return {
    decisionType: 'StartTimer',
    startTimerDecisionAttributes: {
      control: this._name,
      startToFireTimeout: String(this._delay),
      timerId: uuid.v1()
    }
  };
};

var FatalError = function (msg, details) {
  this.message = msg;
  this.details = details;
  this.name = 'FatalError';
  Error.call(this, msg);
};

util.inherits(FatalError, Error);

FatalError.prototype.getDetails = function () {
  return this.details;
};

var FatalErrorAction = function (reason, details) {
  this._reason = reason;
  this._details = details;
};

FatalErrorAction.prototype.getDecision = function () {
  throw new FatalError(this._reason, this._details);
};

/**
 * This is returned when a task has been scheduled/started but not yet completed.
 * We don't want to go to the next task so we return this Noop to tell a 
 * Series pipeline to stop.
 */
var Noop = function () {

};
Noop.prototype.getDecision = function () {
  return null;
};
module.exports = {
  ScheduleAction: ScheduleAction,
  TimerAction: TimerAction,
  Noop: Noop,
  FatalErrorAction: FatalErrorAction
};
