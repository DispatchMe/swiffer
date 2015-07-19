This is a highly configurable, abstract NodeJS framework for Amazon's **Simple Workflow Service** (SWF). It allows you to configure your decisions through a combination of **Pipelines** and **Tasks** (see below), the end result being complete separation between your decider, your activity poller (worker), and the actual activities.

# Table of Contents
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Intro](#intro)
  - [Installation](#installation)
  - [Support](#support)
  - [Contributions](#contributions)
- [Deciders](#deciders)
  - [Basic Usage](#basic-usage)
  - [Pipelines](#pipelines)
    - [Series Pipeline](#series-pipeline)
    - [Parallel Pipeline](#parallel-pipeline)
    - [Continuous Pipeline](#continuous-pipeline)
  - [Tasks](#tasks)
    - [Activity Tasks](#activity-tasks)
      - [Task Input](#task-input)
        - [Dynamic Task Input](#dynamic-task-input)
      - [Retry Strategies](#retry-strategies)
        - [Exponential Backoff](#exponential-backoff)
        - [Constant Backoff](#constant-backoff)
        - [Immediate](#immediate)
        - [None](#none)
    - [Timer Tasks](#timer-tasks)
      - [Dynamic Timer Delays](#dynamic-timer-delays)
- [Workers](#workers)
  - [Basic Usage](#basic-usage-1)
  - [Worker Types](#worker-types)
    - [Inline](#inline)
    - [AWS Lambda](#aws-lambda)
    - [Child Process](#child-process)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Intro
## Installation
`npm install swiffer-framework`

## Support
Please create an issue if you believe you have found a bug or are having trouble. If you're able, please create a failing test for the bug you find so we can easily address it.

## Contributions
Contributions are welcome. Please follow the guideines in `.jshintrc` and use `JSBeautify` before pushing. Also, make sure your code is tested with `jasmine-node`.

# Deciders
Deciders are configured via Pipelines and Tasks.

## Basic Usage

```javascript
var swf = require('swiffer-framework'),
  AWS = require('aws-sdk');


var swfClient = new AWS.SWF({
  region: 'us-east-1',
  accessKeyId: '{ACCESS-KEY}',
  secretAccessKey: '{SECRET-KEY}'
});

var decider = new swf.decider.Decider(PIPELINE, swfClient, {
  domain: 'SWF Domain',
  identity: 'Decider ID',
  taskList: {
    name: 'Task List'
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
```

## Pipelines
A pipeline is a collection of one or more tasks or child pipelines. Once all tasks in the main pipeline passed to the Decider have completed successfully, the workflow is marked as complete.

There are three types of pipeline:

### Series Pipeline
This pipeline executes all of its tasks in sequential order. 

The below example does the following:

1. Schedule the `"My Cool Activity"` activity
2. Once it finishes successfully, start the `"My Timer"` timer
3. Timer fires after 10 seconds - schedule the `"Final Activity"` activity

```javascript
var swf = require('swiffer-framework');
var pipelines = swf.decider.Pipelines;
var Task = swf.decider.Task;

var myPipe = new pipelines.Series([
  new Task({
    type:'activity',
    name:'My Cool Activity',
    activityVersion:'0.1'
  }),

  new Task({
    type:'timer',
    name:'My Timer',
    delay:10
  }),

  new Task({
    type:'activity',
    name:'Final Activity',
    activityVersion:'0.3'
  })
]);
```

### Parallel Pipeline
This executes all of its tasks at the same time. It is most useful as a child in a Series pipeline.

The below example does the following:

1. Schedule the `"My Cool Activity"` activity
2. Once it finishes successfully, start both activites in the child parallel pipeline
3. Schedules the `"Final Activity"` activity after both activities in the child parallel pipeline finish successfully

```javascript
var swf = require('swiffer-framework');
var pipelines = swf.decider.Pipelines;
var Task = swf.decider.Task;

var myPipe = new pipelines.Series([
  new Task({
    type:'activity',
    name:'My Cool Activity',
    activityVersion:'0.1'
  }),

  new pipelines.Parallel([
    new Task({
      type:'activity',
      name:'Parallel Task 1',
      activityVersion:'0.1'
    }),

    new Task({
      type:'activity',
      name:'Parallel Task 2',
      activityVersion:'0.1'
    }),
  ])

  new Task({
    type:'activity',
    name:'Final Activity',
    activityVersion:'0.3'
  })
]);
```

### Continuous Pipeline
A Continuous pipeline is a Series pipeline that starts over if all of its tasks have completed successfully. It will keep running indefinitely unless you tell it to stop with a **Signal**.

The below example does the following:

1. Schedule the `"My Cool Activity"` activity
2. Once it finishes, wait 60 seconds with the `"My Timer"` timer
3. Schedule the `"My Cool Activity"` activity once again (back to #1)
4. Receives a `"StopMyActivity"` signal and breaks its loop

```javascript
var swf = require('swiffer-framework');
var pipelines = swf.decider.Pipelines;
var Task = swf.decider.Task;

var myPipe = new pipelines.Continuous([
  new Task({
    type:'activity',
    name:'My Cool Activity',
    activityVersion:'0.1'
  }),

  new Task({
    type:'timer',
    name:'My Timer',
    delay:60
  })
]).breakOnSignal('StopMyActivity');
```

## Tasks
Tasks are the elements inside of a Pipeline and the next step(s) in the workflow.

Currently there are two task types supported: **Activities** and **Timers**.

**IMPORTANT**: no two tasks in the same "main" pipeline (IE, the pipeline passed to the `Decider` instance) can have the same name. The name is how swiffer determines the decisions for each decision task.

### Activity Tasks
Activity tasks trigger the corresponding worker. They are made up of a `name`, `version`, and an optional **Retry Strategy**. See above examples for how to create an activity task.

#### Task Input
You can give either static or dynamic input (or no input) to your activity task. Simply define the `input` property in the task configuration:

```javascript
var task = new swf.decider.Task({
  type:'activity',
  name:'My Cool Activity',
  activityVersion:'0.1',
  input:{
    foo:'bar'
  }
});
```

##### Dynamic Task Input

###### From previous activity
To modify the input based on the results of the most recently completed "My Initial Activity" activity, do the following (the "$" is used to designate that it is a dynamic value):

```javascript
var task = new swf.decider.Task({
  type:'activity',
  name:'My Cool Activity',
  input:{
    foo:'$My Initial Activity.someProperty.myFoo'
  }
});
```

Assuming the result of the "My Initial Activity" activity was something like:

```json
{
  "someProperty":{
    "myFoo":"asdf1234"
  }
}
```

...then the input passed to the "My Cool Activity" activity would be:

```json
{
  "foo":"asdf1234"
}
```

###### From workflow execution
To modify the input based on the initial input passed to the workflow, do the same as above, but substitute `$$Workflow` for the key:

```javascript
var task = new swf.decider.Task({
  type:'activity',
  name:'My Cool Activity',
  input:{
    foo:'$$Workflow.someProperty.myFoo'
  }
});
```

#### Timeout Configuration
SWF allows you to configure four different timeouts: `scheduleToStartTimeout`, `scheduleToCloseTimeout`, `startToCloseTimeout`, and `heartbeatTimeout`. You can provide these timeouts via your task configuration like so:

```javascript
var task = new swf.decider.Task({
  type:'activity',
  name:'My Cool Activity',
  timeouts:{
    scheduleToStart:30,
    scheduleToClose:300,
    startToClose:360,
    heartbeat:30
  }
});
```

They default to `60`, `360`, `300`, and `60`, respectively, if you do not set them.


#### Retry Strategies

Retry strategies are used to determine when and how to retry an activity that has failed or timed out.

##### Exponential Backoff
With an Exponential Backoff retry strategy, every failed execution of an activity will result in an exponentially greater timer before the next scheduled activity.

For example, the following task will be retried up to 5 times, with the backoff times being 2, 4, 8, and 16 seconds.

```javascript
var task = new swf.decider.Task({
  type:'activity',
  name:'My Cool Activity',
  activityVersion:'0.1',
  retryStrategy:new swf.decider.RetryStrategies.ExponentialBackoff(2, 5)
});
```

##### Constant Backoff
Constant backoff strategies cause the decider to wait a constant number of seconds before retrying the activity.

For example, the following task will be retried up to 10 times before failing the workflow, with 30 seconds between each attempted execution:

```javascript
var task = new swf.decider.Task({
  type:'activity',
  name:'My Cool Activity',
  activityVersion:'0.1',
  retryStrategy:new swf.decider.RetryStrategies.ConstantBackoff(30, 10)
});
```

##### Immediate
Immediate retry strategies will retry the failed activity immediately.

The following task will be retried up to 5 times, with the retry happening immediately after the failed event:

```javascript
var task = new swf.decider.Task({
  type:'activity',
  name:'My Cool Activity',
  activityVersion:'0.1',
  retryStrategy:new swf.decider.RetryStrategies.Immediate(5)
});
```

##### None
The "None" retry strategy will cause a fatal error after one activity execution failure. It is used by default so you should never have to access it directly.

### Timer Tasks
Timer tasks tell SWF to wait a designated number of seconds before moving to the next task. See above examples.

#### Dynamic Timer Delays
The timer delay can be determined by the result of a previous activity. For example, to set the timer based on the results of the most recently completed "My Cool Activity" activity, do the following (the "$" is used to designate that it is a dynamic value):

```javascript
var task = new swf.decider.Task({
  type:'timer',
  name:'My Timer',
  delay:'$My Cool Activity.someProperty.timerDelay'
});
```

Assuming the result of the "My Cool Activity" activity was something like:

```json
{
  "someProperty":{
    "timerDelay":45
  }
}
```

...then the delay would be 45 seconds.

# Workers
Workers are the opposite side of the equation from the Deciders. They perform the activities scheduled by their corresponding Decider.

## Basic Usage

```javascript
var swf = require('swiffer-framework'),
  AWS = require('aws-sdk');


var swfClient = new AWS.SWF({
  region: 'us-east-1',
  accessKeyId: '{ACCESS-KEY}',
  secretAccessKey: '{SECRET-KEY}'
});

var worker = new swf.worker.Worker(swfClient, {
  domain: 'Testing',
  identity: 'test-worker',
  taskList: {
    name: 'MyWorkflow'
  }
});

worker.registerResponder('Initialize', new swf.worker.Responders.Inline(function() {
  this.heartbeat('Started!');

  this.done({
    id:'12345'
  });
}));

worker.on('poll', function() {
  console.log('Polling...');
});

worker.start();
```

## Worker Types

### Inline
The inline worker is simply a Javascript function that gets bound to the `Activity` object. Inline workers can call `this.heartbeat()` to register an SWF heartbeat, `this.error()` to signal an activity failure, and `this.done()` to signal that the activity completed successfully. See above for an example.

Note that `heartbeat()`, `error()`, and `done()` are wrapped in `Futures` from [laverdet/node-fibers](https://github.com/laverdet/node-fibers). This allows you to call them and wait for an acknowledgement from SWF without needing messy asynchronous code.

### AWS Lambda
This will allows you to defer the worker code to an AWS Lambda function. You must provide your own instance of `AWS.Lambda` from the `aws-sdk` library. For example, to call a Lambda function called "MyLambdaFunction", that responds to the "LambdaActivity" activity, you can do the following:

```javascript
var myLambdaClient = new AWS.Lambda({
  region: 'us-east-1',
  accessKeyId: '{ACCESS-KEY}',
  secretAccessKey: '{SECRET-KEY}'
});

worker.registerResponder('LambdaActivity', new swf.workers.Responders.AWSLambda(myLambdaClient, 'MyLambdaFunction'));
```

### Child Process
Coming soon. This is similar to the `Inline` worker type, but it will be spawned as a separate NodeJS process.



