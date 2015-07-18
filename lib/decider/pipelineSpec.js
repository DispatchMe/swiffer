var Pipeline = require('./pipeline');
var Task = require('./task');
var EventList = require('./eventList');
describe('Pipeline', function() {
  describe('Series Pipeline', function() {
    // We already test that tasks know how to determine their own next actions, so it's ok to just test this with one simple task.
    it('Should get correct next actions with an empty task list', function() {
      var pipeline = new Pipeline.Series([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([]));
      expect(next.length).toEqual(1);
    });

    it('Should get correct next actions with all completed tasks', function() {
      var pipeline = new Pipeline.Series([new Task({
        name: 'newTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([{
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
      }]));
      expect(next.length).toEqual(0);
    });
  });

  describe('Parallel Pipeline', function() {
    it('Should get correct next actions with an empty task list', function() {
      var pipeline = new Pipeline.Parallel([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([]));
      expect(next.length).toEqual(2);
    });

    it('Should get correct next actions with one completed task', function() {
      var pipeline = new Pipeline.Parallel([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([{
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
      }]));
      expect(next.length).toEqual(1);
    });

    it('Should get correct next actions with all completed tasks', function() {
      var pipeline = new Pipeline.Parallel([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([{
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
      }, {
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "nextTask"
        },
      }]));
      expect(next.length).toEqual(0);
    });
  });

  describe('Continuous Pipeline', function() {
    it('Should get correct next actions with an empty task list', function() {
      var pipeline = new Pipeline.Continuous([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([]));
      expect(next.length).toEqual(1);
    });

    it('Should get correct next actions with one completed task', function() {
      var pipeline = new Pipeline.Continuous([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([{
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {},
      }]));
      expect(next.length).toEqual(1);
    });

    it('Should get correct next actions with all completed tasks', function() {
      var pipeline = new Pipeline.Continuous([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([{
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
      }, {
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "nextTask"
        },
      }]));
      expect(next.length).toEqual(1);
      expect(next[0]._name).toEqual('newTask');
    });

    it('Should get correct next actions with all completed tasks but break signal', function() {
      var pipeline = new Pipeline.Continuous([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]).breakOnSignal('breakContinuous');

      var next = pipeline.getNextActions(new EventList([{
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
      }, {
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "nextTask"
        },
      }, {
        "eventType": "WorkflowExecutionSignaled",
        "workflowExecutionSignaledEventAttributes": {
          "signalName": "breakContinuous"
        }
      }]));
      expect(next.length).toEqual(0);
    });

    it('Should get correct next actions with all completed tasks on second go-around', function() {
      var pipeline = new Pipeline.Continuous([new Task({
        name: 'newTask',
        type: 'activity'
      }), new Task({
        name: 'nextTask',
        type: 'activity'
      })]);

      var next = pipeline.getNextActions(new EventList([{
        "eventId": 1,
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
      }, {
        "eventId": 2,
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "nextTask"
        },
      }, {
        "eventId": 3,
        "eventType": "ActivityTaskCompleted",
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
      }]));
      expect(next.length).toEqual(1);
      expect(next[0]._name).toEqual('nextTask');
    });
  });

  describe('Compound pipelines', function() {
    it('should get next task with noop', function() {
      var pipeline = new Pipeline.Series([

        new Task({
          name: 'TestWorkflowCreate',
          type: 'activity',
          activityVersion: '0.1'
        }),

        new Pipeline.Continuous([
          new Task({
            name: 'TestWorkflowNextOffer',
            type: 'activity',
            activityVersion: '0.1'
          }),

          new Task({
            name: 'TestWorkflowTimeout',
            type: 'timer',
            delay: 30
          })
        ]).breakOnSignal(['TestWorkflowAccepted', 'TestWorkflowAllRejected'])
      ]);

      var next = pipeline.getNextActions(new EventList([{
        "eventId": 1,
        "eventTimestamp": "2015-07-18T18:56:17.048Z",
        "eventType": "WorkflowExecutionStarted",
        "workflowExecutionStartedEventAttributes": {
          "childPolicy": "TERMINATE",
          "executionStartToCloseTimeout": "1800",
          "input": "INPUT DATA",
          "parentInitiatedEventId": 0,
          "taskList": {
            "name": "TestWorkflow"
          },
          "taskStartToCloseTimeout": "1800",
          "workflowType": {
            "name": "Test Workflow",
            "version": "0.1"
          }
        }
      }, {
        "decisionTaskScheduledEventAttributes": {
          "startToCloseTimeout": "1800",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 2,
        "eventTimestamp": "2015-07-18T18:56:17.048Z",
        "eventType": "DecisionTaskScheduled"
      }, {
        "decisionTaskStartedEventAttributes": {
          "identity": "test-decider2",
          "scheduledEventId": 2
        },
        "eventId": 3,
        "eventTimestamp": "2015-07-18T18:56:17.134Z",
        "eventType": "DecisionTaskStarted"
      }, {
        "decisionTaskCompletedEventAttributes": {
          "scheduledEventId": 2,
          "startedEventId": 3
        },
        "eventId": 4,
        "eventTimestamp": "2015-07-18T18:56:17.587Z",
        "eventType": "DecisionTaskCompleted"
      }, {
        "activityTaskScheduledEventAttributes": {
          "activityId": "TestWorkflowCreate",
          "activityType": {
            "name": "TestWorkflowCreate",
            "version": "0.1"
          },
          "decisionTaskCompletedEventId": 4,
          "heartbeatTimeout": "60",
          "scheduleToCloseTimeout": "360",
          "scheduleToStartTimeout": "60",
          "startToCloseTimeout": "300",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 5,
        "eventTimestamp": "2015-07-18T18:56:17.587Z",
        "eventType": "ActivityTaskScheduled"
      }, {
        "activityTaskStartedEventAttributes": {
          "identity": "6092f0c0-2d7e-11e5-98f3-8b31aed30187",
          "scheduledEventId": 5
        },
        "eventId": 6,
        "eventTimestamp": "2015-07-18T18:56:17.637Z",
        "eventType": "ActivityTaskStarted"
      }, {
        "activityTaskCompletedEventAttributes": {
          "result": "some output",
          "scheduledEventId": 5,
          "startedEventId": 6
        },
        "eventId": 7,
        "eventTimestamp": "2015-07-18T18:56:17.807Z",
        "eventType": "ActivityTaskCompleted"
      }, {
        "decisionTaskScheduledEventAttributes": {
          "startToCloseTimeout": "1800",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 8,
        "eventTimestamp": "2015-07-18T18:56:17.807Z",
        "eventType": "DecisionTaskScheduled"
      }, {
        "decisionTaskStartedEventAttributes": {
          "identity": "test-decider2",
          "scheduledEventId": 8
        },
        "eventId": 9,
        "eventTimestamp": "2015-07-18T18:56:17.865Z",
        "eventType": "DecisionTaskStarted"
      }]));
      expect(next.length).toEqual(1);
      expect(next[0]._name).toEqual('TestWorkflowNextOffer');
    });

  });

  describe('Bug tests w/ real world data', function() {
    it('should get next task in continuous pipe', function() {
      var pipeline = new Pipeline.Series([

        new Task({
          name: 'TestWorkflowCreate',
          type: 'activity',
          activityVersion: '0.1'
        }),

        new Pipeline.Continuous([
          new Task({
            name: 'TestWorkflowNextOffer',
            type: 'activity',
            activityVersion: '0.1'
          }),

          new Task({
            name: 'TestWorkflowTimeout',
            type: 'timer',
            delay: 30
          })
        ]).breakOnSignal(['TestWorkflowAccepted', 'TestWorkflowAllRejected'])
      ]);

      var next = pipeline.getNextActions(new EventList([{
        "eventId": 1,
        "eventTimestamp": "2015-07-18T19:04:43.625Z",
        "eventType": "WorkflowExecutionStarted",
        "workflowExecutionStartedEventAttributes": {
          "childPolicy": "TERMINATE",
          "executionStartToCloseTimeout": "1800",
          "input": "INPUT DATA",
          "parentInitiatedEventId": 0,
          "taskList": {
            "name": "TestWorkflow"
          },
          "taskStartToCloseTimeout": "1800",
          "workflowType": {
            "name": "Test Workflow",
            "version": "0.1"
          }
        }
      }, {
        "decisionTaskScheduledEventAttributes": {
          "startToCloseTimeout": "1800",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 2,
        "eventTimestamp": "2015-07-18T19:04:43.625Z",
        "eventType": "DecisionTaskScheduled"
      }, {
        "decisionTaskStartedEventAttributes": {
          "identity": "test-decider2",
          "scheduledEventId": 2
        },
        "eventId": 3,
        "eventTimestamp": "2015-07-18T19:04:43.722Z",
        "eventType": "DecisionTaskStarted"
      }, {
        "decisionTaskCompletedEventAttributes": {
          "scheduledEventId": 2,
          "startedEventId": 3
        },
        "eventId": 4,
        "eventTimestamp": "2015-07-18T19:04:43.985Z",
        "eventType": "DecisionTaskCompleted"
      }, {
        "activityTaskScheduledEventAttributes": {
          "activityId": "TestWorkflowCreate",
          "activityType": {
            "name": "TestWorkflowCreate",
            "version": "0.1"
          },
          "decisionTaskCompletedEventId": 4,
          "heartbeatTimeout": "60",
          "scheduleToCloseTimeout": "360",
          "scheduleToStartTimeout": "60",
          "startToCloseTimeout": "300",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 5,
        "eventTimestamp": "2015-07-18T19:04:43.985Z",
        "eventType": "ActivityTaskScheduled"
      }, {
        "activityTaskStartedEventAttributes": {
          "identity": "cf37df30-2d7f-11e5-b683-21807b9ad451",
          "scheduledEventId": 5
        },
        "eventId": 6,
        "eventTimestamp": "2015-07-18T19:04:44.145Z",
        "eventType": "ActivityTaskStarted"
      }, {
        "activityTaskCompletedEventAttributes": {
          "result": "{\"autoCancelSeconds\":60}",
          "scheduledEventId": 5,
          "startedEventId": 6
        },
        "eventId": 7,
        "eventTimestamp": "2015-07-18T19:04:44.362Z",
        "eventType": "ActivityTaskCompleted"
      }, {
        "decisionTaskScheduledEventAttributes": {
          "startToCloseTimeout": "1800",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 8,
        "eventTimestamp": "2015-07-18T19:04:44.362Z",
        "eventType": "DecisionTaskScheduled"
      }, {
        "decisionTaskStartedEventAttributes": {
          "identity": "test-decider2",
          "scheduledEventId": 8
        },
        "eventId": 9,
        "eventTimestamp": "2015-07-18T19:04:44.409Z",
        "eventType": "DecisionTaskStarted"
      }, {
        "decisionTaskCompletedEventAttributes": {
          "scheduledEventId": 8,
          "startedEventId": 9
        },
        "eventId": 10,
        "eventTimestamp": "2015-07-18T19:04:44.608Z",
        "eventType": "DecisionTaskCompleted"
      }, {
        "activityTaskScheduledEventAttributes": {
          "activityId": "TestWorkflowNextOffer",
          "activityType": {
            "name": "TestWorkflowNextOffer",
            "version": "0.1"
          },
          "decisionTaskCompletedEventId": 10,
          "heartbeatTimeout": "60",
          "scheduleToCloseTimeout": "360",
          "scheduleToStartTimeout": "60",
          "startToCloseTimeout": "300",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 11,
        "eventTimestamp": "2015-07-18T19:04:44.608Z",
        "eventType": "ActivityTaskScheduled"
      }, {
        "activityTaskStartedEventAttributes": {
          "identity": "cf37df30-2d7f-11e5-b683-21807b9ad451",
          "scheduledEventId": 11
        },
        "eventId": 12,
        "eventTimestamp": "2015-07-18T19:04:44.653Z",
        "eventType": "ActivityTaskStarted"
      }, {
        "activityTaskCompletedEventAttributes": {
          "result": "{\"autoCancelSeconds\":60}",
          "scheduledEventId": 11,
          "startedEventId": 12
        },
        "eventId": 13,
        "eventTimestamp": "2015-07-18T19:04:44.864Z",
        "eventType": "ActivityTaskCompleted"
      }, {
        "decisionTaskScheduledEventAttributes": {
          "startToCloseTimeout": "1800",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 14,
        "eventTimestamp": "2015-07-18T19:04:44.864Z",
        "eventType": "DecisionTaskScheduled"
      }, {
        "decisionTaskStartedEventAttributes": {
          "identity": "test-decider2",
          "scheduledEventId": 14
        },
        "eventId": 15,
        "eventTimestamp": "2015-07-18T19:04:44.922Z",
        "eventType": "DecisionTaskStarted"
      }, {
        "decisionTaskCompletedEventAttributes": {
          "scheduledEventId": 14,
          "startedEventId": 15
        },
        "eventId": 16,
        "eventTimestamp": "2015-07-18T19:04:45.193Z",
        "eventType": "DecisionTaskCompleted"
      }, {
        "eventId": 17,
        "eventTimestamp": "2015-07-18T19:04:45.193Z",
        "eventType": "TimerStarted",
        "timerStartedEventAttributes": {
          "control": "TestWorkflowTimeout",
          "decisionTaskCompletedEventId": 16,
          "startToFireTimeout": "60",
          "timerId": "da4241e0-2d7f-11e5-8349-d971d941cdec"
        }
      }, {
        "eventId": 18,
        "eventTimestamp": "2015-07-18T19:05:45.199Z",
        "eventType": "TimerFired",
        "timerFiredEventAttributes": {
          "startedEventId": 17,
          "timerId": "da4241e0-2d7f-11e5-8349-d971d941cdec"
        }
      }, {
        "decisionTaskScheduledEventAttributes": {
          "startToCloseTimeout": "1800",
          "taskList": {
            "name": "TestWorkflow"
          }
        },
        "eventId": 19,
        "eventTimestamp": "2015-07-18T19:05:45.199Z",
        "eventType": "DecisionTaskScheduled"
      }]));
      expect(next.length).toEqual(1);
      expect(next[0]._name).toEqual('TestWorkflowNextOffer');

    });
  });
});
