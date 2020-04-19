const ServiceOne = require('./serviceOne');
const AWS = require('aws-sdk');

let s3 = new AWS.S3({apiVersion: '2006-03-01'});

/**
 * AWS log loop reads from stdout, so logging via the console logger should be
 * a safe option.
 *
 * @type {ServiceOne}
 */
let serviceOne = new ServiceOne(console.log.bind(console), s3, Date.now, inspector => inspector.getAttribute("uuid"));

module.exports = async (request, context) => {
    return serviceOne.handleRequest(request, context);
};
