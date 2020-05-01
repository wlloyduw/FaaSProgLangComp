const RequestHandler = require('../requestHandler.js');
const readline = require('readline');
const stream = require('stream');
const Inspector = require('../Inspector');
const DbColumns = require("../common/dbColumns");

class ServiceTwoCombined extends RequestHandler {

    _s3;

    _mysql;

    constructor(s3, mysql) {
        super();
        this._s3 = s3;
        this._mysql = mysql;
    }

    readCsv(buffer) {
        return new Promise((resolve, reject) => {
            let passThrough = new stream.PassThrough();
            passThrough.end(buffer);
            let reader = readline.createInterface({
                input: passThrough
            });
            let records = [];
            reader.on('line', (line) => {
                console.log(line);
                records.push(line.split(','));
            });
            reader.on('error', (error) => reject(error));
            reader.on('close', () => resolve(records));
        });
    }

    async handleRequest(request, context) {
        let inspector = new Inspector();
        inspector.inspectAll();
        inspector.addTimeStamp("ServiceTwo.start");
        let connection;
        try {
            inspector.addTimeStamp("ServiceTwo.S3Read.start");
            let body = (await this._s3.getObject({
                Bucket: request.bucketname,
                Key: request.key
            }).promise()).Body;
            inspector.addTimeStamp("ServiceTwo.S3Read.end");
            inspector.addTimeStamp("ServiceTwo.ReadCsv.start");
            let records = await this.readCsv(body);
            inspector.addTimeStamp("ServiceTwo.ReadCsv.end");
            inspector.addTimeStamp("ServiceTwo.OpenConnection.start");
            connection = await this._mysql.createConnection({
                host: request.dbEndpoint,
                database: request.dbName,
                user: process.env.username,
                password: process.env.password,
                charset: 'utf8mb4',
                multipleStatements: true
            });
            inspector.addTimeStamp("ServiceTwo.OpenConnection.end");
            inspector.addTimeStamp("ServiceTwo.WriteAllBatches.start");
            await this._writeValues(inspector, connection, records, request.tableName, request.batchSize);
            inspector.addTimeStamp("ServiceTwo.WriteAllBatches.end");
            inspector.addTimeStamp("ServiceTwo.CloseConnection.start");
            await connection.end();
            inspector.addTimeStamp("ServiceTwo.CloseConnection.end");
        } catch (e) {
            let error = typeof e === 'string' ? e : (e.message + "\n" + e.stack);
            console.log("Failed to write to the database: " + error);
            inspector.addAttribute("ServiceTwo.Error", error);
            if (connection) {
                await connection.destroy();
            }
        }
        inspector.addTimeStamp("ServiceTwo.end");
        inspector.addAttribute("value", "Finished with reading csv into database");
        inspector.inspectAllDeltas();
        return inspector.finish();
    }

    async _writeValues(inspector, connection, records, table, batchSize) {
        inspector.addTimeStamp('ServiceTwo.DropTable.start');
        await connection.query("DROP TABLE IF EXISTS `" + table + "`;");
        inspector.addTimeStamp('ServiceTwo.DropTable.end');
        inspector.addTimeStamp('ServiceTwo.CreateTable.start');
        await connection.query("CREATE TABLE " + table + " (" +
            DbColumns.all().map(c => c.definition()) +
            ") ENGINE = MyISAM;");
        inspector.addTimeStamp('ServiceTwo.CreateTable.end');
        records.splice(0, 1);
        let insertStatement = "INSERT INTO " + table + " (" + DbColumns.all().map(c => c.identifier) + ")" +
            " VALUES (" + DbColumns.all().map(c => "?") + ")";
        let batch = [];
        let batchNumber = 1;
        for (let i = 0; i < records.length; i++) {
            batch.push(records[i]);
            if (batch.length === batchSize) {
                inspector.addTimeStamp('ServiceTwo.WriteBatch(' + batchNumber + ').start');
                await this._writeBatch(connection, insertStatement, batch);
                inspector.addTimeStamp('ServiceTwo.WriteBatch(' + batchNumber + ').end');
                batchNumber ++;
                batch = [];
            }
        }
        if (batch.length > 0) {
            inspector.addTimeStamp('ServiceTwo.WriteBatch(' + batchNumber + ').start');
            await this._writeBatch(connection, insertStatement, batch);
            inspector.addTimeStamp('ServiceTwo.WriteBatch(' + batchNumber + ').end');
        }
    }

    async _writeBatch(connection, insertStatement, batch) {
        let statements = batch.map(row => this._mysql.format(insertStatement, row)).join(";") + ";";
        await connection.query(statements);
    }
}

module.exports = ServiceTwoCombined;