const MySQL = require('promise-mysql');
const AWS = require('aws-sdk');
const ServiceTwo = require('./serviceTwo');

let s3 = new AWS.S3({apiVersion: '2006-03-01'});

let serviceTwo = new ServiceTwo(console.log.bind(console), s3, MySQL, process.env);

module.exports = serviceTwo.asLambda();