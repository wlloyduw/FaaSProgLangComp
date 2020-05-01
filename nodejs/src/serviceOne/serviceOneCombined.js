const Inspector = require('../Inspector');
const RequestHandler = require("../requestHandler");
const CsvColumns = require('../common/csvColumns');
const readline = require('readline');
const stream = require('stream');

class ServiceOneCombined extends RequestHandler {

    _s3;

    constructor(s3) {
        super();
        this._s3 = s3;
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

    writeCsv(records) {
        let result = [];
        let uniqueIds = {};
        records[0][CsvColumns.ORDER_PROCESSING_TIME] = "Order Processing Time";
        records[0][CsvColumns.GROSS_MARGIN] = "Gross Margin";
        result.push(records[0].join(","));
        try {
            for (let i = 1; i < records.length; i++) {
                let record = records[i];
                let uniqueId = parseInt(record[CsvColumns.UNIQUE_ID]);
                if (typeof uniqueIds[uniqueId] !== 'undefined') {
                    continue;
                }
                uniqueIds[uniqueId] = uniqueId;
                record[CsvColumns.PRIORITY] = this._getPriorityName(record[CsvColumns.PRIORITY]);
                record[CsvColumns.ORDER_PROCESSING_TIME] = String(this._timeDiff(this._strToDate(record[CsvColumns.DATE_STARTED]), this._strToDate(record[CsvColumns.DATE_FINISHED])));
                record[CsvColumns.GROSS_MARGIN] = String(parseFloat(record[CsvColumns.PROFIT]) / parseFloat(record[CsvColumns.REVENUE]));
                console.log(record[CsvColumns.ORDER_PROCESSING_TIME]);
                console.log(record[CsvColumns.GROSS_MARGIN]);
                result.push(record.join(","));
            }
        } catch (e) {
            throw Error("Can't parse file " + (typeof e === 'string' ? e : e.message));
        }
        return result.join("\n");
    }

    async handleRequest(request, context) {
        let inspector = new Inspector();
        inspector.inspectAll();
        inspector.addAttribute("message", `bucketname is = ${request['bucketname']}! This is an attributed added to the Inspector!`);
        inspector.addTimeStamp('CsvProcess.start');
        try {
            inspector.addTimeStamp('CsvProcess.S3Read.start');
            let body = (await this._s3.getObject({
                Bucket: request.bucketname,
                Key: request.key
            }).promise()).Body;
            inspector.addTimeStamp('CsvProcess.S3Read.end');
            inspector.addTimeStamp('CsvProcess.CsvRead.start');
            let records = await this.readCsv(body);
            inspector.addTimeStamp('CsvProcess.CsvRead.end');
            inspector.addTimeStamp('CsvProcess.CsvWrite.start');
            let csv = this.writeCsv(records);
            inspector.addTimeStamp('CsvProcess.CsvWrite.end');
            let targetKey = `${request.key.substring(0, request.key.lastIndexOf('.'))}/${Date.now()}_${inspector.getAttribute('uuid')}.csv`;
            inspector.addTimeStamp('CsvProcess.S3Write.start');
            await this._s3.putObject({
                Bucket: request.bucketname,
                Key: targetKey,
                Body: Buffer.from(csv)
            }).promise();
            inspector.addTimeStamp('CsvProcess.S3Write.end');
        } catch (e) {
            console.log("Failed to read requested file: " + (typeof e === 'string' ? e : (e.message + '\n' + e.stack)));
        }
        inspector.addTimeStamp('CsvProcess.end');
        inspector.addAttribute("value", "Bucket: " + request.bucketname + " key:" + request.key + " processed. record 0 = ");
        inspector.inspectAllDeltas();
        return inspector.finish();
    }

    _getPriorityName(priority) {
        switch (priority) {
            case "C":
                return "Critical";
            case "L":
                return "Low";
            case "M":
                return "Medium";
            case "H":
                return "High";
            default:
                return priority;
        }
    }

    _strToDate(string) {
        let split = string.split("/");
        return {
            year: parseInt(split[2]),
            month: parseInt(split[0]),
            day: parseInt(split[1])
        };
    }

    _timeDiff(from, to) {
        return (to.year - from.year) * 365 + (to.month - from.month) * 30 + (to.day - from.day);
    }


}

module.exports = ServiceOneCombined;