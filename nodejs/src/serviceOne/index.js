const ServiceOneCombined = require('./serviceOneCombined');
const AWS = require('aws-sdk');

let s3 = new AWS.S3({apiVersion: '2006-03-01'});

let serviceOne = new ServiceOneCombined(s3);

module.exports = serviceOne.asLambda();
