var _ = require('underscore');
var util = require('util');
var EventList = require('./eventList');

var Pipeline = function (pipe) {
  this._pipe = pipe;
};

var Series = function () {
  Pipeline.apply(this, arguments);
};
util.inherits(Series, Pipeline);
Series.prototype.getNextActions = function (eventlist) {
  var task;
  var actions;

  var afterEventId = null;
  // We stop when we get some actions, since we need to run them in series.
  for (var i = 0; i < this._pipe.length; i++) {
    // Task could either be a real Task or another Pipeline. Either way, they both
    // have getNextActions(eventlist)
    task = this._pipe[i];
    actions = task.getNextActions(eventlist, afterEventId);
    if (actions.length > 0) {
      return actions;
    } else if (actions.lastEventId) {
      afterEventId = actions.lastEventId;
    }
  }
  return [];
};

var Parallel = function () {
  Pipeline.apply(this, arguments);
};
util.inherits(Parallel, Pipeline);

Parallel.prototype.getNextActions = function (eventlist) {
  var task;
  var actions = [];
  // Get all the actions since we need to run them in parallel.
  for (var i = 0; i < this._pipe.length; i++) {
    // Task could either be a real Task or another Pipeline. Either way, they both
    // have getNextActions(eventlist)
    task = this._pipe[i];
    actions = actions.concat(task.getNextActions(eventlist));
  }
  return actions;
};

var Continuous = function () {
  Series.apply(this, arguments);
};

util.inherits(Continuous, Series);
Continuous.prototype.getNextActions = function (eventlist) {
  // Did we get a break signal?
  if (this._breakSignals) {
    var breakEvents = eventlist.getEventsForTaskName(this._breakSignals);
    if (breakEvents.length) {
      console.log('Got break signal. Stopping continuous pipeline.');
      return [];
    }
  }

  var actions = Series.prototype.getNextActions.call(this, eventlist);
  // If actions is EMPTY, AND eventlist HAS events, do the same thing with an empty event list. "Start over".
  if (actions.length === 0 && eventlist.length > 0) {

    return this.getNextActions(new EventList([]));
  }

  return actions;
};

/**
 * Break the continous loop when we get a WorkflowExecutionSignaled event
 * with a certain name
 * @param  {String|Array<String>} signal [description]
 * @return {self} for chaining
 */
Continuous.prototype.breakOnSignal = function (signal) {
  if (!_.isArray(signal)) {
    signal = [signal];
  }
  this._breakSignals = signal;
  return this;
};

module.exports = {
  Series: Series,
  Parallel: Parallel,
  Continuous: Continuous
};
