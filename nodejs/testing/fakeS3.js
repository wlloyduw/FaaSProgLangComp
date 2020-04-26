class FakeS3 {

    _buckets;

    constructor() {
        this._buckets = {};
    }

    /**
     * @param {S3.Types.GetObjectRequest} params
     * @return {_FakeS3Response}
     */
    getObject(params) {
        this._checkParams(params);
        if (typeof this._buckets[params.Bucket][params.Key] === 'undefined') {
            throw Error("Undefined object: " + JSON.stringify(params));
        }
        return this._respondForParams(params);
    }

    /**
     * @param {S3.Types.PutObjectRequest} params
     * @return {_FakeS3Response}
     */
    putObject(params) {
        this._checkParams(params);
        this._buckets[params.Bucket][params.Key] = params.Body;
        return this._respondForParams(params);
    }

    _respondForParams(params) {
        return new _FakeS3Response({
            Body: this._buckets[params.Bucket][params.Key]
        });
    }

    /**
     * @param {S3.Types.GetObjectRequest|S3.Types.PutObjectRequest} params
     * @private
     */
    _checkParams(params) {
        if (typeof params['Bucket'] === 'undefined') {
            throw Error("Parameters should specify a bucket");
        }
        if (typeof params['Key'] === 'undefined') {
            throw Error("Parameters should specify a key");
        }
        if (typeof this._buckets[params.Bucket] === 'undefined') {
            this._buckets[params.Bucket] = {};
        }
    }

}

class _FakeS3Response {

    _value;

    constructor(value) {
        this._value = value;
    }

    promise() {
        return new Promise(resolve => resolve(this._value));
    }

    /**
     * @return {Buffer}
     */
    buffer() {
        return this._value.Body;
    }

    /**
     * @return {string}
     */
    string() {
        return this.buffer().toString();
    }

}



module.exports = FakeS3;