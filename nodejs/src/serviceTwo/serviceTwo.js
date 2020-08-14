const RequestHandler = require('../requestHandler.js');
const Inspector = require('../Inspector');
const LambdaUtils = require("../common/lambdaUtils");
const CsvReader = require("../common/csvReader");
const DbColumns = require("../common/dbColumns");

/**
 * @interface MySQLClient
 */

/**
 * @function MySQLClient#createConnection
 * @param {ConnectionConfig} options
 * @returns {Promise<Connection>}
 * @public
 */

/**
 * @function MySQLClient#format
 * @param {String} sql
 * @param {Object[]} values
 * @returns {String}
 * @public
 */

/**
 * @typedef ServiceTwoRequest
 * @property {String} bucketname
 * @property {String} key
 * @property {String} dbName
 * @property {String} dbEndpoint
 * @property {String} tableName
 * @property {Number} batchSize
 */

class Statements {

    // noinspection SqlNoDataSourceInspection
    static INSERT = (table) => "INSERT INTO " + table + " (" + DbColumns.all().map(c => c.identifier) + ")" +
        " VALUES (" + DbColumns.all().map(c => "?") + ")";

    // noinspection SqlNoDataSourceInspection
    static DROP_TABLE = (table) => "DROP TABLE IF EXISTS `" + table + "`;";

    // noinspection SqlNoDataSourceInspection
    static CREATE_TABLE = (table) => "CREATE TABLE " + table + " (" +
        DbColumns.all().map(c => c.definition()) +
        ") ENGINE = MyISAM;";

}

class ServiceTwo extends RequestHandler {

    /**
     * @type {function(String):void}
     */
    _logger;

    /**
     * @type {S3}
     */
    _s3;

    /**
     * @type {MySQLClient}
     */
    _mysql;

    /**
     * @type {Object}
     */
    _environment;

    /**
     * @type {CsvReader}
     */
    _csvReader;

    /**
     *
     * @param {function(String):void} logger
     * @param {S3} s3
     * @param {MySQLClient} mysql
     * @param {Object} environment
     */
    constructor(logger, s3, mysql, environment) {
        super();
        this._logger = logger;
        this._s3 = s3;
        this._mysql = mysql;
        this._environment = environment;
        this._csvReader = new CsvReader(logger);
    }

    /**
     * @param {ServiceTwoRequest} request
     * @param context
     * @return {Promise<Object>}
     */
    async handleRequest(request, context) {
        let inspector = new Inspector();
        inspector.inspectAll();

        let body;
        try {
            body = await LambdaUtils.readObject(this._s3, request);
        } catch (e) {
            this._log("Failed to read requested file");
            inspector.inspectAllDeltas();
            return inspector.finish();
        }

        let records = await this._csvReader.read(body);

        try {
            /**
             * @type {Connection}
             */
            let connection = await this._mysql.createConnection({
                host: request.dbEndpoint,
                database: request.dbName,
                user: this._environment.username,
                password: this._environment.password,
                charset: 'utf8mb4',
                multipleStatements: true
            });
            await this._writeValues(connection, records, request.tableName, request.batchSize);

            await connection.end();
        } catch (e) {
            this._log("Failed to write to the database: " + (typeof e === 'string' ? e : (e.message + "\n" + e.stack)));
        }

        inspector.addAttribute("value", "Finished with reading csv into database");
        inspector.inspectAllDeltas();
        return inspector.finish();
    }

    /**
     * @param {Connection} connection
     * @param {Array<Array<String>>} records
     * @param {String} table
     * @param {number} batchSize
     * @private
     */
    async _writeValues(connection, records, table, batchSize) {
        // Drop existing table, if needed.
        await connection.query(Statements.DROP_TABLE(table));

        // Create the table.
        await connection.query(Statements.CREATE_TABLE(table));

        // Delete the top row, which is just CSV headers.
        records.splice(0, 1);

        let insertStatement = Statements.INSERT(table);

        let batch = [];
        for (let i = 0; i < records.length; i++) {
            batch.push(records[i]);
            if (batch.length === batchSize) {
                await this._writeBatch(connection, insertStatement, batch);
                batch = [];
            }
        }
        if (batch.length > 0) {
            await this._writeBatch(connection, insertStatement, batch);
        }
    }

    /**
     * @param {Connection} connection
     * @param {String} insertStatement
     * @param {Array<Array<String>>} batch
     * @private
     */
    async _writeBatch(connection, insertStatement, batch) {
        // noinspection SqlNoDataSourceInspection
        let statements = batch.map(row => this._mysql.format(insertStatement, row)).join(";") + ";";
        await connection.query(statements);
    }

    /**
     * @param {String} message
     * @private
     */
    _log(message) {
        this._logger.call(null, message);
    }

}

module.exports = ServiceTwo;