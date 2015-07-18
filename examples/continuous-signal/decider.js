var Decider = require('../../lib/decider/decider'),
  pipelines = require('../../lib/decider/pipeline'),
  Task = require('../../lib/decider/task'),
  retry = require('../../lib/decider/retryStrategies'),
  AWS = require('aws-sdk');


var swfClient = new AWS.SWF({
  region: 'us-east-1',
  accessKeyId: '{ACCESS-KEY}',
  secretAccessKey: '{SECRET-KEY}'
});

var decider = new Decider(new pipelines.Series([

  new Task({
    name: 'Initialize',
    type: 'activity',
    activityVersion: '0.1',
    retryStrategy: new retry.LinearBackoff(5, 5)
  }),

  // Keep running NextThing and waiting {nextDelay} seconds until the workflow is
  // signaled with 'KillMyWorkflow'
  new pipelines.Continuous([
    new Task({
      name: 'NextThing',
      type: 'activity',
      activityVersion: '0.1',
      retryStrategy: new retry.LinearBackoff(30, 5)
    }),

    new Task({
      name: 'NextThingTimeout',
      type: 'timer',
      delay: '$NextThing.nextDelay'
    })
  ]).breakOnSignal(['KillMyWorkflow'])
]), swfClient, {
  domain: 'Testing',
  identity: 'test-decider',
  taskList: {
    name: 'MyWorkflow'
  }
});

decider.on('poll', function() {
  console.log('Polling for decision tasks...');
});
decider.on('error', function(err) {
  console.error(err.message);
  if (err.stack) console.log(err.stack);
});

decider.start();
