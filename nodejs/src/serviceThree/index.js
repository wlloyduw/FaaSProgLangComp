const MySQL = require('promise-mysql');
const AWS = require('aws-sdk');
const ServiceThree = require('./serviceThree');

let s3 = new AWS.S3({apiVersion: '2006-03-01'});

let service = new ServiceThree(console.log.bind(console), s3, MySQL, process.env);
module.exports = service.asLambda();