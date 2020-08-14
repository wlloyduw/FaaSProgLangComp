const MySQL = require('promise-mysql');
const AWS = require('aws-sdk');
const ServiceThreeCombined = require('./serviceThreeCombined');

let s3 = new AWS.S3({apiVersion: '2006-03-01'});

let service = new ServiceThreeCombined(s3, MySQL);
module.exports = service.asLambda();