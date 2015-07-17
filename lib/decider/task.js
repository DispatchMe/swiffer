var _ = require('underscore');

var Task = function(config) {
  _.extend(this, config);
};

var actions = require('./actions');

var eventsByActivityType = {
  activity: {
    fatal: 'ScheduleActivityTaskFailed',
    failed: 'ActivityTaskFailed',
    timeout: 'ActivityTaskTimedOut',
    succeeded: 'ActivityTaskCompleted'
  },
  childWorkflow: {
    fatal: 'StartChildWorkflowExecutionFailed',
    failed: 'ChildWorkflowExecutionFailed',
    timeout: 'ChildWorkflowExecutionTimedOut',
    succeeded: 'ChildWorkflowExecutionCompleted'
  },
  timer: {
    fatal: 'StartTimerFailed',
    succeeded: 'TimerFired'
  }
};

/**
 * This function gets called if the previous task ran successfully (in a series pipeline) or if the parallel pipeline has begun.
 * It will keep being called until there is a "done" event for this task:
 * * "ActivityTaskCompleted"
 * * "TimerFired"
 * * "ChildWorkflowExecutionCompleted"
 *
 * The action can be one of the following:
 *
 * * ScheduleAction     - if the task needs to be scheduled for the first time
 * * RetryAction        - if the task needs to be retried. Could be the same as "ScheduleAction" if there is no delay,
 *                        but will start a Timer if there is a delay
 * * FatalErrorAction   - if there was some configuration error that led to a fatal error. Meaning, we cannot continue without some
 *                        manual intervention at the code or configuration level to fix it.
 * * 
 */
Task.prototype.getNextActions = function(eventlist) {
  var events = eventlist.getEventsForTaskName(this.name);
  var backoffEvents = eventlist.getEventsForTaskName(this.name + '__backoff');

  // No events - schedule
  if (events.length === 0) {
    return [this._getScheduleAction()];
  }

  // Get the last event. That's the one we want to react to. Can't pop because we need it to calculate total failures below
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
  if (lastEvent.isStarted()) {
    return [];
  }

  if (lastEvent.isCompleted()) {
    // If it's a backoff event, we want to schedule the next retry action
    if (lastEvent.isBackoff()) {
      return [this._getRetryAction(events.getTotalFailuresOrTimeouts(), lastEvent)];
    }

    // Otherwise, the actual task is done, so we don't have anything more to do.
    return [];
  }

  if (lastEvent.isFailure() || lastEvent.isTimeout()) {
    return [this._getRetryAction(events.getTotalFailuresOrTimeouts(), lastEvent)];
  }

  // If we got to here, something's wrong, because we should have handled all cases. Throw an error?
  throw new Error('Unhandled event case:', lastEvent.type);
};


Task.prototype._getScheduleAction = function() {
  switch (this.type) {
    case 'activity':
      return new actions.ScheduleAction(this.name, this.input, {
        version: this.activityVersion
      });
    case 'timer':
      return new actions.TimerAction(this.name, this.delay);
    case 'childWorkflow':
      return new actions.ChildWorkflowAction(this.name, this.childWorkflow, {
        taskList: this.workflowTaskList,
        workflowId: this.workflowId,
        name: this.workflowName,
        version: this.workflowVersion
      });
  }

  throw new Error('Invalid task type (' + this.type + ')');
};

Task.prototype._getRetryAction = function(previousFailures, lastEvent) {
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
      return this._getScheduleAction();
    }
  } else {
    // No more retries.
    return new actions.FatalErrorAction('Retry limit reached.');
  }
};

module.exports = Task;
