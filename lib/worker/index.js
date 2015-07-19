module.exports = {
  Worker: require('./worker'),
  Actors: {
    Inline: require('./types/inline'),
    AWSLambda: require('./types/awsLambda')
  }
};
