var events = require('events');
var util = require('util');
var Promise = require('bluebird');
var Poller = function(client, config) {
  events.EventEmitter.call(this);

  this._config = config;

  this._client = Promise.promisifyAll(client);

  // Implementations will override this.
  this._pollMethod = 'abstract';
};

util.inherits(Poller, events.EventEmitter);

Poller.prototype.start = function() {
  // If we wanted to stop before, we don't want to anymore...
  this._stopPoller = false;

  this._poll();
};

/**
 * Poller needs to wait until the end of the poll so that no task gets lost
 */
Poller.prototype.stop = function() {
  this.stopPoller = true;
};

Poller.prototype._poll = function() {
  var self = this;

  if (this._stopPoller === true) {
    this._running = false;
    return;
  }

  this._running = true;

  // Tell event listeners we're polling...
  this.emit('poll', {
    identity: this._config.identity,
    taskList: this._config.taskList
  });

  this._currentRequest = this._client[this._pollMethod](this._config, function(err, result) {
    if (err) {
      self.emit('error', err);
      return;
    }

    if (result.taskToken) {
      self._handleTask(result);
    }

    // Keep going until we get told to stop.
    self._poll();
  });

};

Poller.prototype._handleTask = function(task) {
  throw new Error('_handleTask must be implemented by poller sub-classes');
};

module.exports = Poller;
