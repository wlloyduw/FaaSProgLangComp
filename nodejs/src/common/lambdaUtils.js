/**
 * @typedef S3ObjectRequest
 * @property {String} bucketName
 * @property {String} key
 */

class LambdaUtils {

    /**
     * @param {S3} s3
     * @param {S3ObjectRequest} request
     * @return {Promise<S3.Body>}
     */
    static async readObject(s3, request) {
        let s3Object = await s3.getObject({
            Bucket: request.bucketName,
            Key: request.key
        }).promise();
        return s3Object.Body;
    }

}

module.exports = LambdaUtils;