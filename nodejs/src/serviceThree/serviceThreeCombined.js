const RequestHandler = require('../requestHandler');
const Inspector = require('../Inspector');
const DbColumns = require('../common/dbColumns');
const DbUtils = require('../common/dbUtils');
const CsvUtils = require('../common/csvUtils');

class ServiceThreeCombined extends RequestHandler {

    _s3;

    _mysql;

    constructor(s3, mysql) {
        super();
        this._s3 = s3;
        this._mysql = mysql;
    }

    async handleRequest(request, context) {
        let inspector = new Inspector();
        inspector.inspectAll();
        inspector.addTimeStamp("ServiceThree.start");
        try {
            let query = this._constructQuery(request.tableName);
            inspector.addTimeStamp("ServiceThree.OpenConnection.start");
            let connection = await this._mysql.createConnection({
                host: request.dbEndpoint,
                database: request.dbName,
                user: process.env.username,
                password: process.env.password,
                charset: 'utf8mb4',
                multipleStatements: false
            });
            inspector.addTimeStamp("ServiceThree.OpenConnection.end");
            inspector.addTimeStamp("ServiceThree.RunQuery.start");
            let result = await connection.query(query);
            inspector.addTimeStamp("ServiceThree.RunQuery.end");
            inspector.addTimeStamp("ServiceThree.ConvertResults.start");
            let buffer = Buffer.from(CsvUtils.fromRecords(result.map(row => DbUtils.fromObject(row))));
            inspector.addTimeStamp("ServiceThree.ConvertResults.end");
            inspector.addTimeStamp("ServiceThree.S3Write.start");
            await this._s3.putObject({
                Bucket: request.bucketname,
                Key: request.key,
                Body: buffer
            }).promise();
            inspector.addTimeStamp("ServiceThree.S3Write.end");
            inspector.addTimeStamp("ServiceThree.StressTest.start");
            await this._stressTest(connection, request);
            inspector.addTimeStamp("ServiceThree.StressTest.end");
            inspector.addTimeStamp("ServiceThree.CloseConnection.start");
            await connection.end();
            inspector.addTimeStamp("ServiceThree.CloseConnection.end");
        } catch (e) {
            let error = typeof e === 'string' ? e : (e.message + "\n" + e.stack);
            console.log("I/O problem occurred when trying to finish the task: " + error);
            inspector.addAttribute("ServiceThree.Error", error)
        }
        inspector.addTimeStamp("ServiceThree.end");
        inspector.addAttribute("value", "Finished with querying database");
        inspector.inspectAllDeltas();
        return inspector.finish();
    }

    async _stressTest(connection, request) {
        for (let i = 0; i < request.stressTestLoops; i++) {
            await connection.query("SELECT * FROM " + request.tableName + ";");
        }
    }

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

}

module.exports = ServiceThreeCombined;