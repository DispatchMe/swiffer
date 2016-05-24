var moment = require('moment');

var SWFEvent = function (data) {
  this._data = data;
  this._normalize();
};

function lowercaseFirst(str) {
  return str[0].toLowerCase() + str.substr(1);
}

var categories = ['Decision', 'Schedule', 'StartChildWorkflow', 'ChildWorkflow', 'Activity', 'Timer', 'Workflow',
  'Marker', 'Signal', 'ExternalWorkflow', 'LambdaFunction'
];
SWFEvent.prototype._normalize = function () {

  this.id = this._data.eventId;
  this.timestamp = moment(this._data.eventTimestamp);
  this.type = this._data.eventType;

  // Based on the type, get the attributes.
  var keyName = lowercaseFirst(this.type) + 'EventAttributes';
  this.attributes = this._data[keyName];
  if (this.attributes) {

    if (this.attributes.activityId) {
      // Activities
      this.name = this.attributes.activityId;

    } else if (this.attributes.control) {
      // Timers
      this.name = this.attributes.control;

    } else if (this.attributes.signalName) {
      // Signals
      this.name = this.attributes.signalName;

    } else if (this.attributes.id) {
      // Lambdas
      this.name = this.attributes.id;

    } else if (this.attributes.markerName) {
      // Marker
      this.name = this.attributes.markerName;

    }
    /* else if (this.attributes.workflowId) {
          // StartChildWorkflow.
          this.name = this.attributes.workflowId;

        } else if (this.attributes.workflowExecution && this.attributes.workflowExecution.workflowId) {
          // ChildWorkflowExecution
          this.name = this.attributes.workflowExecution.workflowId;
        }*/
  }

  // Decide which "category" this event is in
  var cat;
  for (var i = 0; i < categories.length; i++) {
    cat = categories[i];
    if (this.type.indexOf(cat) === 0) {
      this.category = lowercaseFirst(cat);
      break;
    }
  }

};

/**
 * Is this event a "Failure" event?
 * @return {Boolean}
 */
SWFEvent.prototype.isFailure = function () {
  return this.type.substr(-6) === 'Failed';
};

/**
 * Is this event a "Timeout" event?
 * @return {Boolean}
 */
SWFEvent.prototype.isTimeout = function () {
  return this.type.substr(-8) === 'TimedOut';
};

/**
 * Is this event a "Completed" event?
 * @return {Boolean}
 */
SWFEvent.prototype.isCompleted = function () {
  if (this.category === 'timer') {
    return this.type.substr(-5) === 'Fired';
  } else if (this.category === 'marker') {
    return this.type.substr(-8) === 'Recorded';
  } else {
    return this.type.substr(-9) === 'Completed';
  }
};

/**
 * Check if this is a timer event for a retry strategy backoff
 * @return {Boolean}
 */
SWFEvent.prototype.isBackoff = function () {
  return this.name.substr(-9) === '__backoff' && this.category === 'timer';
};

/**
 * Is this event a "Started" event?
 * @return {Boolean}
 */
SWFEvent.prototype.isStarted = function () {
  return this.type.substr(-7) === 'Started';
};

SWFEvent.prototype.isScheduled = function () {
  return this.type.substr(-9) === 'Scheduled';
};

SWFEvent.prototype.getRawOutput = function () {
  if (this.category === 'activity' || this.category === 'lambdaFunction') {
    return this.attributes.result || null;
  } else if (this.category === 'workflow') {
    return this.attributes.input || null;
  } else if (this.category === 'marker') {
    return this.attributes.details || null;
  }

  return null;

};

SWFEvent.prototype.getOutput = function () {
  var ret = this.getRawOutput();
  if (ret) {
    try {
      ret = JSON.parse(ret);
    } catch (e) {
      // swallow
    }
  }
  this.jsonOutput = ret;
  return ret;
};

SWFEvent.prototype.getEventId = function () {
  return this._data.eventId;
};

var fatals = ['ScheduleActivityTaskFailed', 'RequestCancelActivityTaskFailed', 'StartChildWorkflowExecutionFailed',
  'RequestCancelExternalWorkflowExecutionFailed', 'StartTimerFailed', 'CancelTimerFailed',
  'ScheduleLambdaFunctionFailed'
];

/**
 * Is this event a fatal event? Meaning, there was some error caused by
 * configuration issue rather than a worker or decider failing.
 * These should kill the entire workflow execution and alert the engineering team.
 * @return {Boolean}
 */
SWFEvent.prototype.isFatal = function () {
  return fatals.indexOf(this.type) >= 0;
};

module.exports = SWFEvent;
