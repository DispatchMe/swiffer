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
  },
}, {
  "eventId": 4,
  "eventTimestamp": "2015-07-14T02:41:18.076Z",
  "eventType": "TimerStarted",
  "timerStartedEventAttributes": {
    "control": "myTimer"
  }

}];

var EventList = require('./eventList');


describe('EventList', function() {
  it('should be aware of its events', function() {
    var list = new EventList(sampleEventList);

    expect(list.length).toEqual(4);

    expect(list.hasStartedOneTaskInList(['createOffer', 'myTimer'])).toEqual(true);
    expect(list.hasStartedAllTasksInList(['createOffer', 'myTimer'])).toEqual(true);
    expect(list.hasCompletedAllTasksInList(['createOffer', 'myTimer'])).toEqual(false);
  });

  it('should get all events for a certain task', function() {
    var list = new EventList(sampleEventList);
    expect(list.getEventsForTaskName('createOffer').length).toEqual(2);
    expect(list.getEventsForTaskName('myTimer').length).toEqual(1);
    expect(list.getEventsForTaskName('foo').length).toEqual(0);
  });

});
