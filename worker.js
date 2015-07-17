var swf = require('aws-swf');
var AWS = swf.AWS;
var uuid = require('uuid');
var util = require('util');
var fs = require('fs');
var Promise = require('bluebird');

// process.config = require('./config.json');

// Config
AWS.config = new AWS.Config({
  region: process.config.aws.region,
  accessKeyId: process.config.aws.accessKey,
  secretAccessKey: process.config.aws.secretKey
});

var worker = new swf.ActivityPoller({
  domain: process.config.swf.domain,
  taskList: {
    name: process.config.swf.taskList
  },
  identity: process.config.swf.identity ? process.config.swf.identity : uuid.v1()
});



worker.on('activityTask', function(task) {
  Promise.promisifyAll(task);
  fs.writeFileSync('taskOutput.json', JSON.stringify(task, null, 4));
  console.log('Got task');

  task.respondCompletedAsync('some output').then(function(response) {
    console.log(response);
  }).catch(function(err) {
    console.log('Exception', err);

  }).error(function(err) {
    console.log('Error', err);
  }).done();
});


worker.on('poll', function() {
  console.log('Polling...');
});

worker.start();
