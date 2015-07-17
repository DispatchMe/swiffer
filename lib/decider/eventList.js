var _ = require('underscore');

var Event = require('./event');

// Hacky way of avoiding adding methods to the Array.prototype
function _EventList() {}
_EventList.prototype = Array.prototype;
EventList = function(data) {
  var self = this;
  if (!_.isArray(data)) {
    throw new Error('Invalid event list data!');
  }
  data.forEach(function(e) {
    // Might be already an event if we're creating a new EventList from a subset of an existing EventList
    var evt;
    if (e instanceof Event) {
      evt = e;
    } else {
      evt = new Event(e);
    }

    self.push(evt);
  });
};

EventList.prototype = new _EventList();

/**
 * Returns TRUE if there is at least one event in the list that has been started.
 * @param  {Array<String>}  list
 * @return {Boolean} 
 */
EventList.prototype.hasStartedOneTaskInList = function(list) {
  var started = this._getStartedTasksByName();

  return _.intersection(list, started).length > 0;
};

/**
 * Returns TRUE if all events in the list have been started
 * @param  {Array<String>}  list 
 * @return {Boolean}
 */
EventList.prototype.hasStartedAllTasksInList = function(list) {
  var started = this._getStartedTasksByName();
  return _.difference(list, started).length === 0;
};

/**
 * Returns TRUE if all events in the list have been completed successfully
 * @param  {Array<String>}  list 
 * @return {Boolean}
 */
EventList.prototype.hasCompletedAllTasksInList = function(list) {
  var completed = this._getCompletedTasksByName();
  return _.difference(list, completed).length === 0;
};

EventList.prototype._getCompletedTasksByName = function() {
  return this._getTasksOfTypeByName('Completed');
};

EventList.prototype._getStartedTasksByName = function() {
  return this._getTasksOfTypeByName('Started');
};

/**
 * Get the total number of events in this list that are either Failure or Timeout.
 * This is used by the Task retry strategy to decide whether or not to
 * continue to retry or to call it a failure.
 * @return {Number}
 */
EventList.prototype.getTotalFailuresOrTimeouts = function() {
  var count = 0;
  this.forEach(function(evt) {
    if (evt.isFailure() || evt.isTimeout()) {
      count++;
    }
  });
  return count;
};


EventList.prototype._getTasksOfTypeByName = function(type) {
  if (!_.isFunction(Event.prototype['is' + type])) {
    throw new Error('Invalid type ' + type);
  }
  var result = [];
  this.forEach(function(evt) {
    if (evt.name && evt['is' + type]()) {
      result.push(evt.name);
    }
  });
  return result;
};

/**
 * Return all the events in this list for a certain task name.
 * @param  {String} name The name of the task
 * @return {EventList}   A new EventList for just those events
 */
EventList.prototype.getEventsForTaskName = function(name) {
  return new EventList(this.filter(function(el) {
    return el.name === name;
  }));
};



module.exports = EventList;
