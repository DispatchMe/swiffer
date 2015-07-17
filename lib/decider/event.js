var _ = require('underscore');
var moment = require('moment');

var Event = function(data) {
  this._data = data;
  this._normalize();
};

function lowercaseFirst(str) {
  return str[0].toLowerCase() + str.substr(1);
}


var categories = ['Decision', 'Schedule', 'ChildWorkflow', 'Activity', 'Timer', 'Workflow', 'Marker', 'Signal', 'ExternalWorkflow'];
Event.prototype._normalize = function() {
  var self = this;

  this.id = this._data.eventId;
  this.timestamp = moment(this._data.eventTimestamp);
  this.type = this._data.eventType;

  // Based on the type, get the attributes.
  var keyName = lowercaseFirst(this.type) + 'EventAttributes';
  this.attributes = this._data[keyName];

  if (this.attributes) {
    if (this.attributes.activityId) {
      this.name = this.attributes.activityId;
    } else if (this.attributes.timerId) {
      this.name = this.attributes.timerId;
    }
  }
  if (this.attributes && this.attributes.activityId) {
    this.name = this.attributes.activityId;
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
Event.prototype.isFailure = function() {
  return this.type.substr(-6) === 'Failed';
};

/**
 * Is this event a "Timeout" event?
 * @return {Boolean}
 */
Event.prototype.isTimeout = function() {
  return this.type.substr(-8) === 'TimedOut';
};

/**
 * Is this event a "Completed" event?
 * @return {Boolean}
 */
Event.prototype.isCompleted = function() {
  if (this.category === 'timer') {
    return this.type.substr(-5) === 'Fired';
  } else {
    return this.type.substr(-9) === 'Completed';
  }
};

/**
 * Check if this is a timer event for a retry strategy backoff
 * @return {Boolean}
 */
Event.prototype.isBackoff = function() {
  return this.name.substr(-9) === '__backoff' && this.category === 'timer';
};

/**
 * Is this event a "Started" event?
 * @return {Boolean}
 */
Event.prototype.isStarted = function() {
  return this.type.substr(-7) === 'Started';
};

var fatals = ['ScheduleActivityTaskFailed', 'RequestCancelActivityTaskFailed', 'StartChildWorkflowExecutionFailed', 'RequestCancelExternalWorkflowExecutionFailed', 'StartTimerFailed', 'CancelTimerFailed'];

/**
 * Is this event a fatal event? Meaning, there was some error caused by configuration issue rather than a worker or decider failing.
 * These should kill the entire workflow execution and alert the engineering team.
 * @return {Boolean}
 */
Event.prototype.isFatal = function() {
  return fatals.indexOf(this.type) >= 0;
};

module.exports = Event;
