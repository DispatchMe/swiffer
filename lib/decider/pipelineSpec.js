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
        "activityTaskCompletedEventAttributes": {
          "activityId": "newTask"
        },
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
  });
});
