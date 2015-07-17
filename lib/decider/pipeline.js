var _ = require('underscore');
var extend = require('../utils/extend');
var EventList = require('./eventList');
var Pipeline, Series, Parallel, Continuous;

Pipeline = (function() {
  Pipeline = function(pipe) {
    this._pipe = pipe;
  };

  return Pipeline;
})();

Series = (function(superclass) {
  Series = function() {
    return Series.__super__.constructor.apply(this, arguments);
  };

  extend(Series, superclass);

  Series.prototype.getNextActions = function(eventlist) {
    var task;
    var actions;
    // We stop when we get some actions, since we need to run them in series.
    for (var i = 0; i < this._pipe.length; i++) {
      // Task could either be a real Task or another Pipeline. Either way, they both
      // have getNextActions(eventlist)
      task = this._pipe[i];
      actions = task.getNextActions(eventlist);
      if (actions.length) {
        return actions;
      }
    }
    return [];
  };
  return Series;
})(Pipeline);


Parallel = (function(superclass) {
  Parallel = function() {
    return Parallel.__super__.constructor.apply(this, arguments);
  };

  extend(Parallel, superclass);

  Parallel.prototype.getNextActions = function(eventlist) {
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
  return Parallel;
})(Pipeline);

Continuous = (function(superclass) {
  Continuous = function() {
    return Continuous.__super__.constructor.apply(this, arguments);
  };

  extend(Continuous, superclass);

  Continuous.prototype.getNextActions = function(eventlist) {
    var actions = Continuous.__super__.getNextActions.call(this, eventlist);
    // If actions is EMPTY, AND eventlist HAS events, do the same thing with an empty event list. "Start over"
    if (actions.length === 0 && eventlist.length > 0) {
      return this.getNextActions(new EventList([]));
    }


    return actions;
  };
  return Continuous;
})(Series);



module.exports = {
  Series: Series,
  Parallel: Parallel,
  Continuous: Continuous
};
