var SWFEvent = require('./event');

describe('Event', function () {
  describe('Normalization', function () {
    it('should work with a timer event', function () {
      var evt = new SWFEvent({
        "eventId": 4,
        "eventTimestamp": "2015-07-14T02:41:18.076Z",
        "eventType": "TimerStarted",
        "timerStartedEventAttributes": {
          "control": "myTimer"
        }
      });
      expect(evt.type).toEqual('TimerStarted');
      expect(evt.category).toEqual('timer');
      expect(evt.attributes.control).toEqual('myTimer');
      expect(evt.name).toEqual('myTimer');
    });

    it('should work with a decision event', function () {
      var evt = new SWFEvent({
        "decisionTaskStartedEventAttributes": {
          "identity": "mySwfDecider",
          "scheduledEventId": 2
        },
        "eventId": 3,
        "eventTimestamp": "2015-07-14T02:39:17.854Z",
        "eventType": "DecisionTaskStarted"
      });
      expect(evt.type).toEqual('DecisionTaskStarted');
      expect(evt.category).toEqual('decision');
      expect(evt.name).toBe(undefined);
    });

    it('should work with an activity event', function () {
      var evt = new SWFEvent({
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
      });
      expect(evt.type).toEqual('ActivityTaskStarted');
      expect(evt.category).toEqual('activity');
      expect(evt.name).toBe('createOffer');
      expect(evt.attributes.activityId).toEqual('createOffer');
    });
  });

  it('isFailure should work', function () {
    var evt = new SWFEvent({
      "eventId": 5,
      "eventTimestamp": "2015-07-14T02:39:18.076Z",
      "eventType": "ScheduleActivityTaskFailed",
      "scheduleActivityTaskFailedEventAttributes": {
        "activityId": "createOffer",
        "activityType": {
          "name": "RoundRobinOffer",
          "version": "1.0"
        },
        "cause": "ACTIVITY_TYPE_DOES_NOT_EXIST",
        "decisionTaskCompletedEventId": 4
      }
    });

    expect(evt.isFailure()).toEqual(true);
  });

  it('isFatal should work', function () {
    var evt = new SWFEvent({
      "eventId": 5,
      "eventTimestamp": "2015-07-14T02:39:18.076Z",
      "eventType": "ScheduleActivityTaskFailed",
      "scheduleActivityTaskFailedEventAttributes": {
        "activityId": "createOffer",
        "activityType": {
          "name": "RoundRobinOffer",
          "version": "1.0"
        },
        "cause": "ACTIVITY_TYPE_DOES_NOT_EXIST",
        "decisionTaskCompletedEventId": 4
      }
    });

    expect(evt.isFatal()).toEqual(true);
  });

  it('isTimeout should work', function () {
    var evt = new SWFEvent({
      "eventId": 5,
      "eventTimestamp": "2015-07-14T02:39:18.076Z",
      "eventType": "DecisionTaskTimedOut"
    });

    expect(evt.isTimeout()).toEqual(true);
  });

  it('isCompleted should work', function () {
    var evt = new SWFEvent({
      "decisionTaskCompletedEventAttributes": {
        "scheduledEventId": 2,
        "startedEventId": 3
      },
      "eventId": 4,
      "eventTimestamp": "2015-07-14T02:39:18.076Z",
      "eventType": "DecisionTaskCompleted"
    });

    expect(evt.isCompleted()).toEqual(true);
  });
});
