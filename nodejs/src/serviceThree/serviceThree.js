const RequestHandler = require('../requestHandler');
const Inspector = require('../Inspector');
const DbColumns = require('../common/dbColumns');
const DbUtils = require('../common/dbUtils');
const CsvUtils = require('../common/csvUtils');

/**
 * @typedef ServiceThreeRequest
 * @property {String} bucketname
 * @property {String} key
 * @property {String} dbName
 * @property {String} dbEndpoint
 * @property {String} tableName
 * @property {Number} stressTestLoops
 */

class ServiceThree extends RequestHandler {

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
    }

    /**
     *
     * @param {ServiceThreeRequest} request
     * @param context
     * @return {Promise<Object>}
     */
    async handleRequest(request, context) {
        let inspector = new Inspector();
        inspector.inspectAll();

        try {
            let query = this._constructQuery(request.tableName);

            /**
             * @type {Connection}
             */
            let connection = await this._mysql.createConnection({
                host: request.dbEndpoint,
                database: request.dbName,
                user: this._environment.username,
                password: this._environment.password,
                charset: 'utf8mb4',
                multipleStatements: false
            });

            let result = await connection.query(query);

            let buffer = Buffer.from(CsvUtils.fromRecords(result.map(row => DbUtils.fromObject(row))));

            await this._s3.putObject({
                Bucket: request.bucketname,
                Key: request.key,
                Body: buffer
            }).promise();

            await this._stressTest(connection, request);

            await connection.end();
        } catch (e) {
            this._log("I/O problem occurred when trying to finish the task: " + (typeof e === 'string' ? e : (e.message + "\n" + e.stack)));
            inspector.addAttribute("value", "Finished with querying database");
            inspector.inspectAllDeltas();
            return inspector.finish();
        }

        this._log("Successfully finished processing request");

        inspector.addAttribute("value", "Finished with querying database");
        inspector.inspectAllDeltas();
        return inspector.finish();
    }

    /**
     * @param {Connection} connection
     * @param {ServiceThreeRequest} request
     * @return {Promise<void>}
     * @private
     */
    async _stressTest(connection, request) {
        for (let i = 0; i < request.stressTestLoops; i++) {
            this._log(String(i));
            await connection.query("SELECT * FROM " + request.tableName + ";");
        }
    }

    /**
     * @param {String} tableName
     * @return {String}
     * @private
     */
    _constructQuery(tableName) {
        let filter = {};
        filter[DbColumns.REGION.identifier] = ["Australia and Oceania"];
        filter[DbColumns.ITEM_TYPE.identifier] = ["Office Supplies"];
        filter[DbColumns.SALES_CHANNEL.identifier] = ["Offline"];
        filter[DbColumns.PRIORITY.identifier] = ["Critical"];
        filter[DbColumns.COUNTRY.identifier] = ["Fiji"];

        return this._constructUnionSql(tableName, filter, {
            "max": [DbColumns.UNITS_SOLD.identifier],
            "min": [DbColumns.UNITS_SOLD.identifier],
            "avg": [DbColumns.ORDER_PROCESSING_TIME.identifier, DbColumns.GROSS_MARGIN.identifier, DbColumns.UNITS_SOLD.identifier],
            "sum": [DbColumns.UNITS_SOLD.identifier, DbColumns.REVENUE.identifier, DbColumns.PROFIT.identifier]
        });
    }

    /**
     * @param {String} table
     * @param {{String: Array<String>}} filter
     * @param {{String:Array<String>}} aggregate
     * @returns {String}
     * @private
     */
    _constructUnionSql(table, filter, aggregate) {
        let projection = Object.keys(aggregate)
            .map(fn => aggregate[fn].map(col => fn.toUpperCase() + "(" + col + ")").join(", "))
            .join(", ");
        return Object.keys(filter)
            .map(col => filter[col].map(value => this._constructSql(table, projection, col, value)))
            .join(" UNION ") + ";";
    }

    _constructSql(table, projection, filterColumn, filterValue) {
        return "SELECT " + projection + ", " +
            "'WHERE " + filterColumn.replace(/^`|`$/g, '') + "=" + filterValue + "' AS `Filtered By`"
            + " FROM " + table + " WHERE " + filterColumn + "= '" + filterValue + "'";
    }

    /**
     * @param {String} message
     * @private
     */
    _log(message) {
        this._logger.call(null, message);
    }

}

module.exports = ServiceThree;