var EventList = require('./eventList');
var actions = require('./actions');
var retryStrategies = require('./retryStrategies');
var parameters = [
  // Already finished - nothing to do
  {
    task: {
      name: 'createOffer',
      type: 'activity'
    },
    list: [{
      "eventType": "ActivityTaskStarted",
      "activityTaskStartedEventAttributes": {
        "activityId": "createOffer",
      }
    }, {
      "eventType": "ActivityTaskCompleted",
      "activityTaskCompletedEventAttributes": {
        "activityId": "createOffer"
      },
    }],
    expect: []
  },
  // Not yet started. Schedule it
  {
    task: {
      name: 'newTask',
      type: 'activity'
    },
    expect: [new actions.ScheduleAction('newTask', undefined, {
      version: undefined
    })]
  },
  // Not yet started. Start the timer
  {
    task: {
      name: 'newTimer',
      type: 'timer',
      delay: 10
    },
    expect: [new actions.TimerAction('newTimer', 10)]
  },
  // Started, but not yet fired.
  {
    task: {
      name: 'myTimer',
      type: 'timer',
      delay: 10
    },
    list: [{

      "eventType": "TimerStarted",
      "timerStartedEventAttributes": {
        "control": "myTimer"
      },

    }],
    // Should be a "Noop" action
    expect: [{}]
  },
  // Started + fired. Do nothing
  {
    task: {
      name: 'myOtherTimer',
      type: 'timer',
      delay: 10
    },
    list: [{
      "eventType": "TimerStarted",
      "timerStartedEventAttributes": {
        "control": "myOtherTimer"
      }
    }, {
      "eventType": "TimerFired",
      "timerFiredEventAttributes": {
        "control": "myOtherTimer"
      }
    }],
    expect: []
  },

  // Start timer and fill in dynamic config from previous result
  {
    task: {
      name: 'newTimer',
      type: 'timer',
      delay: '$previousActivity.someResult'
    },
    list: [{
      "eventType": "ActivityTaskCompleted",
      "activityTaskCompletedEventAttributes": {
        "activityId": "previousActivity",
        "result": JSON.stringify({
          "someResult": 30
        })
      }
    }],
    expect: [new actions.TimerAction('newTimer', 30)]
  },

  // Scheduling failed. Fatal
  {
    task: {
      name: 'badConfigActivity',
      type: 'activity'
    },
    list: [{
      "eventType": "ScheduleActivityTaskFailed",
      "scheduleActivityTaskFailedEventAttributes": {
        "activityId": "badConfigActivity",
        "cause": "SOMETHING WENT WRONG"
      }
    }],
    expect: [new actions.FatalErrorAction("SOMETHING WENT WRONG", undefined)]
  },
  // Activity failed. Retry strategy says try again right away.
  {
    task: {
      name: 'failedActivity',
      type: 'activity',
      retryStrategy: new retryStrategies.Immediate(10)
    },
    list: [{
      "eventType": "ActivityTaskFailed",
      "activityTaskFailedEventAttributes": {
        "activityId": "failedActivity"
      }
    }],
    expect: [new actions.ScheduleAction('failedActivity', undefined, {
      version: undefined
    })]
  },

  // Activity failed. Retry strategy says try again in 10 seconds
  {
    task: {
      name: 'failedActivity',
      type: 'activity',
      retryStrategy: new retryStrategies.ConstantBackoff(10, 10)
    },
    list: [{
      "eventType": "ActivityTaskFailed",
      "activityTaskFailedEventAttributes": {
        "activityId": "failedActivity"
      }
    }],
    expect: [new actions.TimerAction('failedActivity__backoff', 10)]
  },

  // Activity failed and backoff timer fired. Reschedule. 
  // (These need timestamps to determine if the timer fired was after the failed)
  {
    task: {
      name: 'failedActivity',
      type: 'activity',
      retryStrategy: new retryStrategies.ConstantBackoff(10, 10)
    },
    list: [{
      "eventType": "ActivityTaskFailed",
      "eventTimestamp": "2015-07-14T02:38:17.767Z",
      "activityTaskFailedEventAttributes": {
        "activityId": "failedActivity"
      }
    }, {
      "eventType": "TimerFired",
      "eventTimestamp": "2015-07-14T02:39:17.767Z",
      "timerFiredEventAttributes": {
        "control": "failedActivity__backoff"
      }
    }],
    expect: [new actions.ScheduleAction('failedActivity', undefined, {
      version: undefined
    })]
  },
  // Activity failed twice and last backoff timer fired. Retry limit is 2, so fatal.
  {
    task: {
      name: 'failedActivity',
      type: 'activity',
      retryStrategy: new retryStrategies.ConstantBackoff(10, 2)
    },
    list: [{
      "eventType": "ActivityTaskFailed",
      "eventTimestamp": "2015-07-14T02:37:17.767Z",
      "activityTaskFailedEventAttributes": {
        "activityId": "failedActivity"
      }
    }, {
      "eventType": "ActivityTaskFailed",
      "eventTimestamp": "2015-07-14T02:38:17.767Z",
      "activityTaskFailedEventAttributes": {
        "activityId": "failedActivity"
      }
    }, {
      "eventType": "TimerFired",
      "eventTimestamp": "2015-07-14T02:39:17.767Z",
      "timerFiredEventAttributes": {
        "control": "failedActivity__backoff"
      }
    }],
    expect: [new actions.FatalErrorAction('Retry limit reached.')]

  },
  
  // Lambda ready to start
  {
    task: {
      name: 'lambdaReadyToStart',
      type: 'lambda',
      functionName: 'MyLambda',
      input: {
        foo: 'bar'
      }
    },
    list: [],
    expect: [new actions.ScheduleLambdaAction('lambdaReadyToStart', 'MyLambda', {"foo":"bar"}, {})]
  },
  
  // Lambda completed
  {
    task: {
      name: 'lambdaCompleted',
      type: 'lambda',
      functionName: 'MyLambda',
      input: {
        foo: 'bar'
      }
    },
    list: [{
      eventType: 'LambdaFunctionCompleted',
      lambdaFunctionCompletedEventAttributes: {
        result: 'Completed',
        id: 'lambdaCompleted'
      }
    }],
    expect: []
  },
  
  // Lambda scheduled
  {
    task: {
      name: 'lambdaScheduled',
      type: 'lambda',
      functionName: 'MyLambda'
    },
    list: [{
      eventType: 'LambdaFunctionScheduled',
      lambdaFunctionScheduledEventAttributes: {
        id: 'lambdaScheduled',
        name: 'MyLambda'
      }
    }],
    expect: [new actions.Noop()]
  },
  
  // Lambda failed, no retry
  {
    task: {
      name: 'lambdaFailedNoRetry',
      type: 'lambda',
      functionName: 'MyLambda',
      input: {
        foo: 'bar'
      }
    },
    list: [{
      eventType: 'LambdaFunctionFailed',
      lambdaFunctionFailedEventAttributes: {
        reason: 'event',
        id: 'lambdaFailedNoRetry'
      }
    }],
    expect: [new actions.FatalErrorAction('Retry limit reached.')]
  },
  
  // Lambda schedule failed
  {
    task: {
      name: 'lambdaScheduleFailed',
      type: 'lambda',
      functionName: 'MyLambda',
      input: {
        foo: 'bar'
      }
    },
    list: [{
      eventType: 'ScheduleLambdaFunctionFailed',
      scheduleLambdaFunctionFailedEventAttributes: {
        cause: 'OPEN_LAMBDA_FUNCTIONS_LIMIT_EXCEEDED',
        id: 'lambdaScheduleFailed'
      }
    }],
    expect: [new actions.FatalErrorAction("OPEN_LAMBDA_FUNCTIONS_LIMIT_EXCEEDED", undefined)]
  },
    
  // Marker ready
  {
    task: {
      name: 'markerReady',
      type: 'marker',
      details: 'marker data'
    },
    list: [],
    expect: [new actions.RecordMarkerAction('markerReady', 'marker data')]
  },
  
  // Marker recorded, performed multiple times.
  {
    task: {
      name: 'markerRecorded',
      type: 'marker',
      details: 'marker data'
    },
    list: [{
      eventType: 'MarkerRecorded',
      lambdaFunctionScheduledEventAttributes: {
        name: 'MarkerRecorded',
        details: 'previous marker data'
      }
    }, {
      eventType: 'MarkerRecorded',
      lambdaFunctionScheduledEventAttributes: {
        name: 'MarkerRecorded',
        details: 'marker data'
      }
    }],
    expect: [new actions.Noop()]
  },
  
  
  // Input from previous task as object
  {
    task: {
      name: 'randomActivity',
      type: 'activity',
      activityVersion: '0.1',
      input: {
        baz: '$FirstActivity.foo.bar.baz'
      },
      retryStrategy: new retryStrategies.ConstantBackoff(10, 2)
    },
    list: [{
      "eventType": "ActivityTaskCompleted",
      "eventTimestamp": "2015-07-14T02:37:17.767Z",
      "activityTaskCompletedEventAttributes": {
        "activityId": "FirstActivity",
        "result": JSON.stringify({
          foo: {
            bar: {
              baz: 'boop'
            }
          }
        })
      }
    }],
    expect: [new actions.ScheduleAction('randomActivity', {
      baz: 'boop'
    }, {
      version: '0.1'
    })]
  },

  // Input from previous task as string
  {
    task: {
      name: 'randomActivity',
      type: 'activity',
      activityVersion: '0.1',
      input: {
        baz: '$FirstActivity'
      },
      retryStrategy: new retryStrategies.ConstantBackoff(10, 2)
    },
    list: [{
      "eventType": "ActivityTaskCompleted",
      "eventTimestamp": "2015-07-14T02:37:17.767Z",
      "activityTaskCompletedEventAttributes": {
        "activityId": "FirstActivity",
        "result": "boop"
      }
    }],
    expect: [new actions.ScheduleAction('randomActivity', {
      baz: 'boop'
    }, {
      version: '0.1'
    })]
  },

  // Input from workflow start activity
  {
    task: {
      name: 'randomActivity',
      type: 'activity',
      activityVersion: '0.1',
      input: {
        foo: '$$Workflow'
      },
      retryStrategy: new retryStrategies.ConstantBackoff(10, 2)
    },
    list: [{
      "eventId": 1,
      "eventTimestamp": "2015-07-19T16:34:46.246Z",
      "eventType": "WorkflowExecutionStarted",
      "workflowExecutionStartedEventAttributes": {
        "childPolicy": "TERMINATE",
        "executionStartToCloseTimeout": "1800",
        "input": "INPUT DATA",
        "parentInitiatedEventId": 0,
        "taskList": {
          "name": "RoundRobin"
        },
        "taskStartToCloseTimeout": "1800",
        "workflowType": {
          "name": "Test Workflow",
          "version": "0.1"
        }
      }
    }],
    expect: [new actions.ScheduleAction('randomActivity', {
      foo: 'INPUT DATA'
    }, {
      version: '0.1'
    })]
  }
];

var Task = require('./task');

describe('Task', function () {
  parameters.forEach(function (param, idx) {
    it('getNextActions - parameterized - #' + idx.toString(), function () {
      var task = new Task(param.task);
      expect(JSON.stringify(task.getNextActions(new EventList(param.list || [])))).toEqual(JSON.stringify(
        param.expect));
    });
  });
});
