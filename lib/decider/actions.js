var uuid = require('uuid');

var ScheduleAction = function(name, input, config) {
  this._name = name;
  this._input = input;
  this._activityConfig = config;
};

ScheduleAction.prototype.act = function(decisionTask) {
  decisionTask.response.addDecision({
    decisionType: 'ScheduleActivityTask',
    scheduleActivityTaskDecisionAttributes: {
      activityId: this._name,
      activityType: {
        name: this_.name,
        version: this._activityConfig.version,
      },
      input: this._input,
      scheduleToStartTimeout: '60',
      scheduleToCloseTimeout: '360',
      startToCloseTimeout: '300',
      heartbeatTimeout: '60'

    }
  });
};

var TimerAction = function(name, delay) {
  this._name = name;
  this._delay = delay;
};

TimerAction.prototype.act = function(decisionTask) {
  decisionTask.response.addDecision({
    decisionType: 'StartTimer',
    startTimerDecisionAttributes: {
      control: this._name,
      startToFireTimeout: String(this._delay),
      timerId: uuid.v1()
    }
  });
};

var ChildWorkflowAction = function(name, input, config) {
  this._name = name;
  this._input = input;
  this._workflowConfig = config;
};

ChildWorkflowAction.prototype.act = function(decisionTask) {
  decisionTask.response.start_childworkflow({
    control: this._name,
    input: this._input,
    taskList: this._workflowConfig.taskList,
    workflowId: this._workflowConfig.workflowId,
    workflowType: {
      name: this._workflowConfig.name,
      version: this._workflowConfig.version
    }
  });
};

var FatalError = function(msg, details) {
  this.message = msg;
  this.details = details;
};

FatalError.prototype = Error.prototype;
FatalError.prototype.getDetails = function() {
  return this.details;
};

var FatalErrorAction = function(reason, details) {
  this._reason = reason;
  this._details = details;
};

FatalErrorAction.prototype.act = function() {
  throw new FatalError(this._reason, this._details);
};

module.exports = {
  ScheduleAction: ScheduleAction,
  TimerAction: TimerAction,
  FatalErrorAction: FatalErrorAction,
  ChildWorkflowAction: ChildWorkflowAction
};
