const Inspector = require('../Inspector');
const RequestHandler = require("../requestHandler");
const CsvReader = require('../common/csvReader');
const CsvWriter = require('./csvWriter');

/**
 * @typedef ServiceOneRequest
 * @property {String} bucketName
 * @property {String} key
 */

/**
 * @typedef {function(): number} TimeTagProducer
 */

/**
 * @typedef {function(Inspector): *} UUIDProvider
 */

/**
 * @extends RequestHandler
 */
class ServiceOne extends RequestHandler {

    /**
     * @type {function(String):void}
     */
    _logger;

    /**
     * @type {S3}
     */
    _s3;

    /**
     * @type {TimeTagProducer}
     */
    _timeTagProducer;

    /**
     * @type {UUIDProvider}
     */
    _uuidProvider;

    /**
     * @type {CsvReader}
     */
    _csvReader;

    /**
     * @type {CsvWriter}
     */
    _csvWriter;

    /**
     * @param {function(string):void} logger
     * @param {S3} s3
     * @param {TimeTagProducer} timeTagProducer
     * @param {UUIDProvider} uuidProvider
     */
    constructor(logger, s3, timeTagProducer, uuidProvider) {
        super();
        this._logger = logger;
        this._s3 = s3;
        this._timeTagProducer = timeTagProducer;
        this._uuidProvider = uuidProvider;
        this._csvReader = new CsvReader(logger);
        this._csvWriter = new CsvWriter(logger);
    }

    /**
     * @param {ServiceOneRequest} request
     * @param context
     * @return {Promise<Attributes>}
     */
    async handleRequest(request, context) {
        let inspector = new Inspector();
        inspector.inspectAll();

        inspector.addAttribute("message", `bucketname is = ${request['bucketName']}! This is an attributed added to the Inspector!`);

        let body;
        try {
            body = await this._readRequestedFile(request);
        } catch (e) {
            this._log("Failed to read requested file");
            inspector.inspectAllDeltas();
            return inspector.finish();
        }
        let output = await this._produceCsvOutput(body);
        await this._uploadCsv(request, inspector, output);

        inspector.addAttribute("value", "Bucket: " + request.bucketName + " key:" + request.key + " processed. record 0 = ");
        inspector.inspectAllDeltas();

        return inspector.finish();
    }

    /**
     * @param {String} message
     * @private
     */
    _log(message) {
        this._logger.call(null, message);
    }

    /**
     * @param {ServiceOneRequest} request
     * @return {Promise<S3.Body>}
     */
    async _readRequestedFile(request) {
        this._log("start getobj");
        let s3Object = await this._s3.getObject({
            Bucket: request.bucketName,
            Key: request.key
        }).promise();

        /**
         * @type {S3.Body}
         */
        let body = s3Object.Body;
        this._log("finished getobj");
        return body;
    }

    /**
     * @param {S3.Body} body
     * @return {Promise<Buffer>}
     */
    async _produceCsvOutput(body) {
        let output;
        try {
            this._log("started reading csv");
            let records = await this._csvReader.read(body);
            this._log("finished reading csv, starting to write csv");
            output = this._csvWriter.write(records);
            this._log("finished writing csv");
        } catch (e) {
            this._log("Error reading csv: " + (typeof e === 'string' ? e : e.message));
        }
        return Buffer.from(output);
    }

    /**
     * @param {ServiceOneRequest} request
     * @param {Inspector} inspector
     * @param {Buffer} csv
     * @return {Promise<*>}
     */
    async _uploadCsv(request, inspector, csv) {
        let targetKey = `${request.key.substring(0, request.key.lastIndexOf('.'))}/${this._timeTagProducer.call()}_${this._uuidProvider.call(null, inspector)}.csv`;
        return this._s3.putObject({
            Bucket: request.bucketName,
            Key: targetKey,
            Body: csv
        }).promise();
    }
}

module.exports = ServiceOne;