var sampleEventList = [{
  "eventId": 1,
  "eventTimestamp": "2015-07-14T02:39:17.767Z",
  "eventType": "WorkflowExecutionStarted",
  "workflowExecutionStartedEventAttributes": {
    "childPolicy": "TERMINATE",
    "executionStartToCloseTimeout": "1800",
    "input": "INPUT DATA",
    "parentInitiatedEventId": 0,
    "taskList": {
      "name": "test-tasks4"
    },
    "taskStartToCloseTimeout": "1800",
    "workflowType": {
      "name": "Test Workflow",
      "version": "0.1"
    }
  }
}, {
  "eventId": 2,
  "eventTimestamp": "2015-07-14T02:39:18.076Z",
  "eventType": "ActivityTaskStarted",
  "activityTaskStartedEventAttributes": {
    "activityId": "createOffer",
    "activityType": {
      "name": "RoundRobinOffer",
      "version": "1.0"
    }
  }
}, {
  "eventId": 3,
  "eventTimestamp": "2015-07-14T02:40:18.076Z",
  "eventType": "ActivityTaskCompleted",
  "activityTaskCompletedEventAttributes": {
    "activityId": "createOffer",
    "activityType": {
      "name": "RoundRobinOffer",
      "version": "1.0"
    }
  }
}, {
  "eventId": 4,
  "eventTimestamp": "2015-07-14T02:41:18.076Z",
  "eventType": "TimerStarted",
  "timerStartedEventAttributes": {
    "control": "myTimer"
  }
}];

var sampleList2 = [{
  "eventId": 11,
  "eventTimestamp": "2015-07-30T15:56:25.452Z",
  "eventType": "StartChildWorkflowExecutionFailed",
  "startChildWorkflowExecutionFailedEventAttributes": {
    "cause": "WORKFLOW_TYPE_DOES_NOT_EXIST",
    "decisionTaskCompletedEventId": 10,
    "initiatedEventId": 0,
    "control": "Child",
    "workflowId": "Child",
    "workflowType": {
      "name": "Process File",
      "version": "1.0"
    }
  }
}];

var sampleList3 = [{
  "eventId": 2,
  "eventTimestamp": "2015-07-14T02:39:18.076Z",
  "eventType": "LambdaFunctionScheduled",
  "lambdaFunctionScheduledEventAttributes": {
    "id": "getBalance",
    "name": "GetUserBalance",
  }
}, {
  "eventId": 3,
  "eventTimestamp": "2015-07-14T02:39:18.076Z",
  "eventType": "LambdaFunctionStarted",
  "lambdaFunctionStartedEventAttributes": {
    "scheduledEventId": 2
  }
}, {
  "eventId": 4,
  "eventTimestamp": "2015-07-14T02:40:18.076Z",
  "eventType": "LambdaFunctionCompleted",
  "lambdaFunctionCompletedEventAttributes": {
    "scheduledEventId": 2,
    "startedEventId": 3,
    "result": "16 credits"
  },
}];

var EventList = require('./eventList');

describe('EventList', function () {
  it('should be aware of its events', function () {
    var list = new EventList(sampleEventList);

    expect(list.length).toEqual(4);

    expect(list.hasStartedOneTaskInList(['createOffer', 'myTimer'])).toEqual(true);
    expect(list.hasStartedAllTasksInList(['createOffer', 'myTimer'])).toEqual(true);
    expect(list.hasCompletedAllTasksInList(['createOffer', 'myTimer'])).toEqual(false);
  });

  it('should get all events for a certain task', function () {
    var list = new EventList(sampleEventList);
    expect(list.getEventsForTaskName('createOffer').length).toEqual(2);
    expect(list.getEventsForTaskName('myTimer').length).toEqual(1);
    expect(list.getEventsForTaskName('foo').length).toEqual(0);
  });

  describe('child workflow failing', function () {
    it('should be aware of its events', function () {
      var list = new EventList(sampleList2);
      expect(list.getEventsForTaskName('Child').length).toEqual(1);
      expect(list[0].isFatal()).toEqual(true);
    });
  });

  it('should link lambda events through the event id', function () {
    var list = new EventList(sampleList3);
    expect(list.hasStartedOneTaskInList(['getBalance'])).toEqual(true);
    expect(list.hasCompletedAllTasksInList(['getBalance'])).toEqual(true);
  });
});
