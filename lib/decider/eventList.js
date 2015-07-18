var _ = require('underscore');
var util = require('util');
var SWFEvent = require('./event');

// Hacky way of avoiding adding methods to the Array.prototype

var EventList = function (data) {
  Array.call(this);

  var self = this;
  if (!_.isArray(data)) {
    throw new Error('Invalid event list data!');
  }

  var eventsByEventId = {};
  data.forEach(function (e) {
    // Might be already an event if we're creating a new EventList from a subset of an existing EventList
    var evt;
    if (e instanceof SWFEvent) {
      evt = e;
    } else {
      evt = new SWFEvent(e);
    }

    self.push(evt);
    eventsByEventId[e.eventId] = evt;
  });

  // Go through each event and set name from related event.
  var relatedEvent;
  this.forEach(function (evt) {
    if (evt.name) {
      return;
    }
    if (evt.attributes) {
      relatedEvent = null;
      if (evt.category === 'activity' && evt.attributes.scheduledEventId) {
        relatedEvent = eventsByEventId[evt.attributes.scheduledEventId];

      } else if (evt.category === 'timer' && evt.attributes.startedEventId) {
        relatedEvent = eventsByEventId[evt.attributes.startedEventId];
      }

      if (relatedEvent) {
        evt.name = relatedEvent.name;
      }
    }
  });
};

util.inherits(EventList, Array);

/**
 * Returns TRUE if there is at least one event in the list that has been started.
 * @param  {Array<String>}  list
 * @return {Boolean} 
 */
EventList.prototype.hasStartedOneTaskInList = function (list) {
  var started = this._getStartedTasksByName();

  return _.intersection(list, started).length > 0;
};

/**
 * Returns TRUE if all events in the list have been started
 * @param  {Array<String>}  list 
 * @return {Boolean}
 */
EventList.prototype.hasStartedAllTasksInList = function (list) {
  var started = this._getStartedTasksByName();
  return _.difference(list, started).length === 0;
};

/**
 * Returns TRUE if all events in the list have been completed successfully
 * @param  {Array<String>}  list 
 * @return {Boolean}
 */
EventList.prototype.hasCompletedAllTasksInList = function (list) {
  var completed = this._getCompletedTasksByName();
  return _.difference(list, completed).length === 0;
};

EventList.prototype._getCompletedTasksByName = function () {
  return this._getTasksOfTypeByName('Completed');
};

EventList.prototype._getStartedTasksByName = function () {
  return this._getTasksOfTypeByName('Started');
};

/**
 * Get the total number of events in this list that are either Failure or Timeout.
 * This is used by the Task retry strategy to decide whether or not to
 * continue to retry or to call it a failure.
 * @return {Number}
 */
EventList.prototype.getTotalFailuresOrTimeouts = function () {
  var count = 0;
  this.forEach(function (evt) {
    if (evt.isFailure() || evt.isTimeout()) {
      count++;
    }
  });
  return count;
};

EventList.prototype._getTasksOfTypeByName = function (type) {
  if (!_.isFunction(SWFEvent.prototype['is' + type])) {
    throw new Error('Invalid type ' + type);
  }
  var result = [];
  this.forEach(function (evt) {
    if (evt.name && evt['is' + type]()) {
      result.push(evt.name);
    }
  });
  return result;
};

/**
 * Return all the events in this list for a certain task name.
 * @param  {String|Array<String>} name The name of the task
 * @return {EventList}   A new EventList for just those events
 */
EventList.prototype.getEventsForTaskName = function (name) {
  if (!_.isArray(name)) {
    name = [name];
  }
  return new EventList(this.filter(function (el) {
    return name.indexOf(el.name) >= 0;
  }));
};

module.exports = EventList;
