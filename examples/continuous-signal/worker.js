var AWS = require('aws-sdk'),
  Promise = require('bluebird'),
  Worker = require('../../lib/worker/worker'),
  JavascriptResponder = require('../../lib/worker/types/javascript');


var swfClient = new AWS.SWF({
  region: 'us-east-1',
  accessKeyId: '{ACCESS-KEY}',
  secretAccessKey: '{SECRET-KEY}'
});

var worker = new Worker(swfClient, {
  domain: 'Testing',
  identity: 'test-worker',
  taskList: {
    name: 'MyWorkflow'
  }
});

worker.registerResponder('Initialize', new JavascriptResponder(function() {
  var self = this;
  this.heartbeat('Started!').then(function() {
    return self.done({
      id: '12345'
    });
  }).done();
}));

worker.registerResponder('NextThing', new JavascriptResponder(function() {
  var self = this;
  this.done({
    nextDelay: Math.floor(Math.random() * 30) + 1
  });
}));

worker.on('poll', function() {
  console.log('Polling...');
});

worker.start();
