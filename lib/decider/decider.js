var util = require('util');
var Poller = require('../utils/poller');
var _ = require('underscore');
var EventList = require('./eventList');
var Promise = require('bluebird');
var fs = require('fs');

var Decider = function(pipeline, client, config) {
  this._pipeline = pipeline;
  Poller.call(this, client, config);

  this._pollMethod = 'pollForDecisionTask';
};

util.inherits(Decider, Poller);

Decider.prototype._getPages = function(data, events) {
  var self = this;
  var config = _.clone(this._config);

  events = events || [];
  events = events.concat(data.events);

  if (data.nextPageToken) {
    config.nextPageToken = data.nextPageToken;
    return this._client.pollForDecisionTaskAsync(config).then(function(nextPageData) {
      return self._getPages(nextPageData, events);
    });
  } else {
    return Promise.resolve(events);
  }
};

Decider.prototype._handleTask = function(data) {
  console.log('Decision task received');
  fs.writeFileSync('output.json', JSON.stringify(data, null, 4));
  var self = this;
  if (!_.isArray(data.events)) {
    this.emit('error', new Error('Invalid decision task data!'));
    return;
  }


  this._getPages(data).then(function(events) {
    return self._handleEvents(data.taskToken, events);
  }).catch(function(err) {
    self.emit('error', err);
  }).done();
};

Decider.prototype._handleEvents = function(taskToken, events) {
  var list = new EventList(events);
  var actions = this._pipeline.getNextActions(list);
  var decisions = [];

  console.log('Parsed event list. %d actions to perform', actions.length);

  // We finished all of the pipes (nothing to do, but wait, would be an action.Noop).
  if (actions.length === 0) {
    decisions.push({
      decisionType: 'CompleteWorkflowExecution',
      completeWorkflowExecutionDecisionAttributes: {
        result: 'All tasks completed successfully.'
      }
    });
  } else {
    try {

      actions.forEach(function(action) {
        var decision = action.getDecision();
        if (decision) {
          decisions.push(decision);
        }
      });
    } catch (err) {
      if (err.name === 'FatalError') {
        this.emit('error', err);
        // Fail the execution
        decisions = [{
          decisionType: 'FailWorkflowExecution',
          failWorkflowExecutionDecisionAttributes: {
            reason: err.message
          }
        }];
      } else {
        // Otherwise just throw it so we don't actually respond with decisions. Probably a code
        // error that needs to be fixed so we can let the decision task time out and try again.
        throw err;
      }
    }
  }

  // If anything cares about the decisions going out to SWF...
  this.emit('decisions', decisions);


  return this._client.respondDecisionTaskCompletedAsync({
    taskToken: taskToken,
    decisions: decisions
  });
};

module.exports = Decider;
