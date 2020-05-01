const MySQL = require('promise-mysql');
const AWS = require('aws-sdk');
const ServiceTwoCombined = require('./serviceTwoCombined');

let s3 = new AWS.S3({apiVersion: '2006-03-01'});

let serviceTwo = new ServiceTwoCombined(s3, MySQL);

module.exports = serviceTwo.asLambda();