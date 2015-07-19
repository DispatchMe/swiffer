var _ = require('underscore');
var dot = require('dot-component');
var retry = require('./retryStrategies');
var Task = function (config) {
  _.extend(this, config);

  if (!this.retryStrategy) {
    this.retryStrategy = new retry.None();
  }
};

var actions = require('./actions');

/**
 * Populate an input object with dynamic data from previous events
 * @param  {Object|String} data      Data to populate
 * @param  {EventList} eventlist The previous event list
 * @return {mixed}           The populated object
 */
var populateDynamicConfig = function (data, eventlist) {
  if (_.isString(data)) {
    if (data[0] === '$') {
      var key = data.substr(1).split('.');
      var lastEvent;

      // Pass info from WorkflowExecutionStarted event
      if (key[0] === '$Workflow') {
        var evt = _.findWhere(eventlist, {
          type: 'WorkflowExecutionStarted'
        });
        if (evt) {
          lastEvent = evt;
        } else {
          return null;
        }
        // Otherwise get data from identified event by activityId/name
      } else {
        var events = eventlist.getEventsForTaskName(key[0]);
        if (!events.length) {
          return null;
        }
        lastEvent = events[events.length - 1];
      }

      var output = lastEvent.getOutput();

      if (!_.isObject(output)) {
        // We can't do anything unless key length is 1
        if (key.length === 1) {
          return output;
        } else {
          throw new Error('Output from ' + key[0] + ' is not an object - cannot access using dot notation! (got "' +
            output.toString() + '")');
        }
      } else {
        if (key.length === 1) {
          return output;
        }
        return dot.get(output, key.slice(1).join('.'));
      }
    } else {
      return data;
    }
  } else if (_.isObject(data)) {
    var newObj = {};
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        newObj[k] = populateDynamicConfig(data[k], eventlist);
      }
    }
    return newObj;
  }

  return data;
};

/**
 * This function gets called if the previous task ran successfully (in a series pipeline) 
 * or if the parallel pipeline has begun.
 * It will keep being called until there is a "done" event for this task:
 * * "ActivityTaskCompleted"
 * * "TimerFired"
 * * "ChildWorkflowExecutionCompleted"
 *
 * The action can be one of the following:
 *
 * * ScheduleAction     - if the task needs to be scheduled for the first time
 * * RetryAction        - if the task needs to be retried. Could be the same as 
 *                         "ScheduleAction" if there is no delay,
 *                        but will start a Timer if there is a delay
 * * FatalErrorAction   - if there was some configuration error that led to a fatal error. 
 *                        Meaning, we cannot continue without some manual intervention at 
 *                        the code or configuration level to fix it.
 * * 
 */
Task.prototype.getNextActions = function (eventlist, afterEventId) {
  var events = eventlist.getEventsForTaskName(this.name);

  if (afterEventId) {
    events = events.filter(function (evt) {
      return evt.getEventId() > afterEventId;
    });
  }
  var backoffEvents = eventlist.getEventsForTaskName(this.name + '__backoff');

  // No events - schedule
  if (events.length === 0) {
    return [this._getScheduleAction(eventlist)];
  }

  // Get the last event. That's the one we want to react to. Can't pop because we need 
  // it to calculate total failures below
  var lastEvent = events[events.length - 1];

  var lastBackoffEvent = null;
  if (backoffEvents.length > 0) {
    lastBackoffEvent = backoffEvents.pop();
    if (lastBackoffEvent.timestamp.isAfter(lastEvent.timestamp)) {
      lastEvent = lastBackoffEvent;
    }
  }

  if (lastEvent.isFatal()) {
    return [new actions.FatalErrorAction(lastEvent.attributes.cause)];
  }

  // It started, but it hasn't been finished yet. Do nothing.
  if (lastEvent.isStarted() || lastEvent.isScheduled()) {
    return [new actions.Noop()];
  }

  if (lastEvent.isCompleted()) {
    // If it's a backoff event, we want to schedule the next retry action
    if (lastEvent.isBackoff()) {
      return [this._getRetryAction(eventlist, events.getTotalFailuresOrTimeouts(), lastEvent)];
    }

    // Otherwise, the actual task is done, so we don't have anything more to do. 
    // We need to return the eventId of the last id for Series pipelines so they 
    // can use it to calculate sequential order.
    var toReturn = [];
    toReturn.lastEventId = lastEvent.getEventId();
    return toReturn;
  }

  if (lastEvent.isFailure() || lastEvent.isTimeout()) {
    console.log('Last event for this task failed or timed out. Getting retry action.');
    return [this._getRetryAction(eventlist, events.getTotalFailuresOrTimeouts(), lastEvent)];
  }

  // If we got to here, something's wrong, because we should have handled all cases. Throw an error?
  throw new Error('Unhandled event case:');
};

Task.prototype._getScheduleAction = function (eventlist) {

  switch (this.type) {
  case 'activity':
    var options = {
      version: this.activityVersion
    };

    if (this.timeouts) {
      _.extend(options, {
        scheduleToStartTimeout: this.timeouts.scheduleToStart,
        scheduleToCloseTimeout: this.timeouts.scheduleToClose,
        startToCloseTimeout: this.timeouts.startToClose,
        heartbeatTimeout: this.timeouts.heartbeat
      });
    }
    return new actions.ScheduleAction(this.name, populateDynamicConfig(this.input, eventlist), options);
  case 'timer':
    return new actions.TimerAction(this.name, populateDynamicConfig(this.delay, eventlist));
    // case 'childWorkflow':
    //   return new actions.ChildWorkflowAction(this.name, this.childWorkflow, {
    //     taskList: this.workflowTaskList,
    //     workflowId: this.workflowId,
    //     name: this.workflowName,
    //     version: this.workflowVersion
    //   });
  default:
    throw new Error('Invalid activity type "' + this.type + '"');
  }

  throw new Error('Invalid task type (' + this.type + ')');
};

Task.prototype._getRetryAction = function (eventlist, previousFailures, lastEvent) {
  // Look at retry logic for the config
  if (this.retryStrategy.shouldRetry(previousFailures)) {
    var wait;
    if (lastEvent.isBackoff()) {
      // This is the end of the backoff timer. So set wait to 0 so we can reschedule;
      wait = 0;
    } else {
      wait = this.retryStrategy.getBackoffTime(previousFailures);
    }
    if (wait > 0) {
      // Add a timer for backoff that will trigger the next try asynchronously
      return new actions.TimerAction(this.name + '__backoff', wait);
    } else {
      return this._getScheduleAction(eventlist);
    }
  } else {
    // No more retries.
    return new actions.FatalErrorAction('Retry limit reached.');
  }
};

module.exports = Task;
