var _ = require('underscore');
var util = require('util');
var EventList = require('./eventList');

var Pipeline = function (pipe) {
  this._pipe = pipe;
  this._signalEvents = {};
};

Pipeline.prototype.onSignal = function (signal, action) {
  var self = this;
  if (!_.isArray(signal)) {
    signal = [signal];
  }

  signal.forEach(function (sig) {
    if (!self._signalEvents[sig]) {
      self._signalEvents[sig] = [];
    }

    self._signalEvents[sig].push(action);
  });

  return this;
};

/**
 * All pipelines can act on signals. So monitor and act on them here.
 * The individual pipeline types can decide whether to keep going if this
 * returns signal actions or to stop and just act on the signal responses.
 */
Pipeline.prototype.getNextActions = function (eventlist) {
  var self = this;
  var actions = [];
  // Check for signals we care about that happened since the last DecisionTaskCompleted event (meaning, we have
  // not yet seen them)
  var signalsWeCareAbout = _.keys(this._signalEvents);

  // Are we monitoring any signals?
  if (signalsWeCareAbout.length) {

    signalsWeCareAbout.forEach(function (signal) {

      // What are the tasks/pipelines we need to execute when we receive that signal?
      var tasks = self._signalEvents[signal];

      // Get the events for just this signal so we can inspect them
      var specificSignalEvents = eventlist.getEventsForTaskName(signal);

      // Get the last signal event
      var lastSignalEvent = specificSignalEvents[specificSignalEvents.length - 1];

      if (lastSignalEvent) {
        tasks.forEach(function (task) {
          // Only Continuous pipelines act on breaks, so we can skip these.
          if (task === 'break') {
            return;
          }
  
          // What is the most recent "first" event in the pipe? (In a continuous pipe,
          // the "first" event could have happened multiple times, so to account for that
          // we need to get the most recent one.)
          var first = task.mostRecentFirstEvent(eventlist);
  
          // What is the most recent "last" event in the pipe?
          var last = task.mostRecentLastEvent(eventlist);
  
          // We only want to act if one of the following are true:
          // 
          // 1) We have not yet responded to this signal (first === null)
          // 2) We have responded to this signal, but have not yet completed (last === null)
          // 3) We have responded to this signal, completed it, but the last completed event is before 
          //    the most recent signal. That means, we got it again, so we need to start from scratch or
          //    continue from where we left off in the last decision. (last.getEventId() < lastSignalEvent.getEventId()).
  
          var act = false;
          var fromEventId = null;
          if (!first || !last) {
            act = true;
          } else if (lastSignalEvent.getEventId() > last.getEventId()) {
            act = true;
            fromEventId = lastSignalEvent.getEventId();
          }
  
          if (act) {
            actions = actions.concat(task.getNextActions(eventlist, fromEventId));
          }
        });
      }
    });

  }
  return actions;
};

/**
 * Get the most recent first event for the first task in the pipeline
 * @param  {EventList} eventlist Event list to inspect
 * @return {Event|Null}           
 */
Pipeline.prototype.mostRecentFirstEvent = function (eventlist) {
  var firstTask = this._pipe[0];
  while (firstTask instanceof Pipeline) {
    firstTask = firstTask._pipe[0];
  }

  return firstTask.mostRecentFirstEvent(eventlist);
};

/**
 * Get the most recent last event for the last task in the pipeline
 * @param  {EventList} eventlist Event list to inspect
 * @return {Event|Null} 
 */
Pipeline.prototype.mostRecentLastEvent = function (eventlist) {
  var lastTask = this._pipe[this._pipe.length - 1];
  while (lastTask instanceof Pipeline) {
    lastTask = lastTask._pipe[0];
  }

  return lastTask.mostRecentLastEvent(eventlist);
};

var Series = function () {
  Pipeline.apply(this, arguments);
};
util.inherits(Series, Pipeline);
Series.prototype.getNextActions = function (eventlist) {
  var signalActions = Pipeline.prototype.getNextActions.call(this, eventlist);
  if (signalActions.length) {
    return signalActions;
  }

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

  // If there are any signal actions, just add them to the list and keep going,
  // since we're running all of these in parallel anyway.
  var signalActions = Pipeline.prototype.getNextActions.call(this, eventlist);
  if (signalActions.length) {
    actions = actions.concat(signalActions);
  }

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
  if (Object.keys(this._signalEvents).length) {
    var signalTasks;
    var breakEvents;
    for (var signal in this._signalEvents) {
      if (!this._signalEvents.hasOwnProperty(signal)) {
        continue;
      }

      signalTasks = this._signalEvents[signal];
      if (signalTasks.indexOf('break') >= 0) {
        breakEvents = eventlist.getEventsForTaskName(signal);
        if (breakEvents.length > 0) {
          console.log('Got break signal. Stopping continuous pipeline.');
          return [];
        }

      }
    }
  }

  var actions = Series.prototype.getNextActions.call(this, eventlist);
  // If actions is EMPTY, AND eventlist HAS events, do the same thing with an empty event list. "Start over".
  if (actions.length === 0 && eventlist.length > 0) {

    return this.getNextActions(new EventList([]));
  }

  return actions;
};

module.exports = {
  Series: Series,
  Parallel: Parallel,
  Continuous: Continuous
};
