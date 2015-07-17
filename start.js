var swf = require('aws-swf');
var AWS = swf.AWS;
var uuid = require('uuid');

// process.config = require('./config.json');

// Config
AWS.config = new AWS.Config({
   region: process.config.aws.region,
   accessKeyId: process.config.aws.accessKey,
   secretAccessKey: process.config.aws.secretKey
});


var workflow = new swf.Workflow({
   "domain": "Testing",
   "workflowType": {
      "name": "Test Workflow",
      "version": "0.1"
   },
   "taskList": {
      "name": "test-tasks4"
   },
   "executionStartToCloseTimeout": "1800",
   "taskStartToCloseTimeout": "1800",
   "childPolicy": "TERMINATE"
});


var workflowExecution = workflow.start({
   input: "INPUT DATA"
}, function(err, runId) {

   if (err) {
      console.log("Cannot start workflow : ", err);
      return;
   }

   console.log("Workflow started, runId: " + runId);

});
