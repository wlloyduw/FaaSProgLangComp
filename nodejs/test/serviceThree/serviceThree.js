const DbUtils = require('../../src/common/dbUtils');
const CsvUtils = require('../../src/common/csvUtils');
const CsvColumns = require('../../src/common/csvColumns');
const ServiceThree = require('../../src/serviceThree/serviceThree');
const FakeS3 = require('../../testing/fakeS3');
const FakeMySql = require('../../testing/fakeMySql');
const chai = require('chai');
chai.use(require('chai-string'));
const expect = chai.expect;
const sinon = require('sinon');

describe('ServiceThree', () => {

    const sandbox = sinon.createSandbox();

    /**
     * @type {FakeS3}
     */
    let fakeS3;

    /**
     * @type {ServiceThree}
     */
    let service;

    /**
     * @type {String}
     */
    let lastLog;

    beforeEach(() => {
        fakeS3 = new FakeS3();
        sandbox.spy(fakeS3, 'getObject');
        sandbox.spy(fakeS3, 'putObject');
        service = new ServiceThree(message => {
            lastLog = message;
        }, fakeS3, FakeMySql, {
            username: 'zoe',
            password: 'UW'
        });
    });

    afterEach(() => {
        sandbox.restore();
        FakeMySql.reset();
    });

    it('does not interact with S3 if database has issues', async () => {
        await service.handleRequest({}, null);

        expect(fakeS3.putObject.called).to.be.false;
    });

    it('reads its values from the database', async () => {
        FakeMySql.expectConnection({
            host: 'aws',
            database: 'myDb',
            user: 'zoe',
            password: 'UW',
            charset: 'utf8mb4',
            multipleStatements: false
        });

        await service.handleRequest({
            dbEndpoint: 'aws',
            dbName: 'myDb',
            tableName: 'myTable'
        }, null);

        expect(lastLog).to.match(/Unexpected statement: SELECT/);
    });

    it('uploads the read results to S3', async () => {
        let dbValues = [
            DbUtils.toObject(CsvUtils.recordWith(CsvColumns.COST, "123", CsvColumns.COUNTRY, "USA")),
            DbUtils.toObject(CsvUtils.recordWith(CsvColumns.COST, "456", CsvColumns.COUNTRY, "Iran")),
            DbUtils.toObject(CsvUtils.recordWith(CsvColumns.COST, "789", CsvColumns.COUNTRY, "Canada")),
        ];
        let connection = FakeMySql.expectConnection({
            host: 'aws',
            database: 'myDb',
            user: 'zoe',
            password: 'UW',
            charset: 'utf8mb4',
            multipleStatements: false
        });

        connection.expect(/SELECT/, dbValues);

        let request = {
            dbEndpoint: 'aws',
            dbName: 'myDb',
            tableName: 'myTable',
            bucketName: 'myBucket',
            key: 'root/sub-directory/file.csv'
        };
        await service.handleRequest(request, null);

        expect(connection.queries()).to.have.lengthOf(1);
        expect(connection.queries(0)).to.be.equal("SELECT MAX(`Units Sold`), MIN(`Units Sold`), " +
            "AVG(`Order Processing Time`), AVG(`Gross Margin`), AVG(`Units Sold`), SUM(`Units Sold`), " +
            "SUM(`Total Revenue`), SUM(`Total Profit`), 'WHERE Region=Australia and Oceania' AS `Filtered By` " +
            "FROM myTable WHERE `Region`= 'Australia and Oceania' " +
            "UNION SELECT MAX(`Units Sold`), " +
            "MIN(`Units Sold`), AVG(`Order Processing Time`), AVG(`Gross Margin`), AVG(`Units Sold`), " +
            "SUM(`Units Sold`), SUM(`Total Revenue`), SUM(`Total Profit`), " +
            "'WHERE Item Type=Office Supplies' AS `Filtered By` FROM myTable WHERE `Item Type`= 'Office Supplies' " +
            "UNION SELECT MAX(`Units Sold`), MIN(`Units Sold`), AVG(`Order Processing Time`), AVG(`Gross Margin`), " +
            "AVG(`Units Sold`), SUM(`Units Sold`), SUM(`Total Revenue`), SUM(`Total Profit`), " +
            "'WHERE Sales Channel=Offline' AS `Filtered By` FROM myTable WHERE `Sales Channel`= 'Offline' " +
            "UNION SELECT MAX(`Units Sold`), MIN(`Units Sold`), AVG(`Order Processing Time`), AVG(`Gross Margin`), " +
            "AVG(`Units Sold`), SUM(`Units Sold`), SUM(`Total Revenue`), SUM(`Total Profit`), " +
            "'WHERE Order Priority=Critical' AS `Filtered By` FROM myTable " +
            "WHERE `Order Priority`= 'Critical' " +
            "UNION SELECT MAX(`Units Sold`), MIN(`Units Sold`), AVG(`Order Processing Time`), AVG(`Gross Margin`), " +
            "AVG(`Units Sold`), SUM(`Units Sold`), SUM(`Total Revenue`), SUM(`Total Profit`), " +
            "'WHERE Country=Fiji' AS `Filtered By` FROM myTable WHERE `Country`= 'Fiji';");

        let records = CsvUtils.toRecords(fakeS3.getObject({
            Bucket: request.bucketName,
            Key: request.key,
        }).string());

        expect(records).to.have.lengthOf(dbValues.length);

        for (let i = 0; i < records.length; i++) {
            let record = DbUtils.fromObject(dbValues[i]);
            expect(records[i]).to.have.lengthOf(record.length);
            for (let j = 0; j < records[i].length; j++) {
                expect(records[i][j]).to.be.equal(record[j]);
            }
        }

        expect(lastLog).to.be.equal("Successfully finished processing request");
    });

    it('performs stress testing in non-batch statements', async () => {
        let dbValues = [];
        let connection = FakeMySql.expectConnection({
            host: 'aws',
            database: 'myDb',
            user: 'zoe',
            password: 'UW',
            charset: 'utf8mb4',
            multipleStatements: false
        });

        let batchSize = 4;
        connection.expect(/SELECT/, dbValues);
        for (let i = 0; i < batchSize; i++) {
            connection.expect(/SELECT \*/, dbValues);
        }

        let request = {
            dbEndpoint: 'aws',
            dbName: 'myDb',
            tableName: 'myTable',
            bucketName: 'myBucket',
            key: 'root/sub-directory/file.csv',
            stressTestLoops: batchSize
        };
        await service.handleRequest(request, null);

        expect(connection.queries()).to.have.lengthOf(batchSize + 1);

        for (let i = 0; i < batchSize; i++) {
            expect(connection.queries(i + 1)).to.be.equal("SELECT * FROM myTable;");
        }

        expect(lastLog).to.be.equal("Successfully finished processing request");
    });

});