const ServiceTwo = require('../../src/serviceTwo/serviceTwo');
const FakeS3 = require('../../testing/fakeS3');
const FakeMySql = require('../../testing/fakeMySql');
const CsvUtils = require("../../testing/csvUtils");
const chai = require('chai');
chai.use(require('chai-string'));
const expect = chai.expect;
const sinon = require('sinon');

describe("ServiceTwo", () => {

    const sandbox = sinon.createSandbox();

    /**
     * @type {FakeS3}
     */
    let fakeS3;

    /**
     * @type {ServiceTwo}
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
        service = new ServiceTwo(message => {
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

    describe('before connecting to the database', () => {

        it('will read from the S3 bucket', async () => {
            await service.handleRequest({
                bucketName: 'bucket1',
                key: 'myCsvFile.csv'
            }, null);
            expect(fakeS3.getObject.calledOnce).to.be.true;
            expect(fakeS3.getObject.getCall(0).args).to.have.lengthOf(1);
            expect(fakeS3.getObject.getCall(0).args[0]).to.have.property('Bucket', 'bucket1');
            expect(fakeS3.getObject.getCall(0).args[0]).to.have.property('Key', 'myCsvFile.csv');
        });

        it('will not write anything if CSV file does not exist', async () => {
            await service.handleRequest({
                bucketName: 'bucket1',
                key: 'myCsvFile.csv'
            }, null);

            expect(lastLog).to.match(/Failed to read requested file/);
        });

    });

    describe('when an appropriately formatted CSV exists', () => {

        beforeEach(() => {
            let input = [
                CsvUtils.emptyRecord(),
                CsvUtils.recordWith(0, "A", 1, "B"),
                CsvUtils.recordWith(0, "C", 1, "D"),
                CsvUtils.recordWith(0, "E", 1, "F"),
                CsvUtils.recordWith(0, "G", 1, "H"),
            ];
            fakeS3.putObject({
                Bucket: 'bucket1',
                Key: 'myCsvFile.csv',
                Body: Buffer.from(CsvUtils.fromRecords(input))
            });

            sandbox.reset();
        });

        it('will quit gracefully when database fails to connect', async () => {
            await service.handleRequest({
                bucketName: 'bucket1',
                key: 'myCsvFile.csv'
            }, null);

            expect(lastLog).to.match(/Unexpected connection/);
        });

        it('will quit gracefully when database fails to query', async () => {
            FakeMySql.expectConnection();

            await service.handleRequest({
                bucketName: 'bucket1',
                key: 'myCsvFile.csv'
            }, null);

            expect(lastLog).to.match(/Unexpected statement: DROP TABLE/);
        });

        describe('after connecting to the database', () => {

            let connection;

            /**
             * @param {function(ServiceOneRequest):ServiceOneRequest} request
             */
            let createRequest = (request = {}) => {
                return {
                    bucketName: 'bucket1',
                    key: 'myCsvFile.csv',
                    dbName: 'theDB',
                    dbEndpoint: 'myHost',
                    tableName: 'myTable',
                    batchSize: 100,
                    ...request
                };
            };

            beforeEach(() => {
                connection = FakeMySql.expectConnection({
                    dbName: 'theDB',
                    dbEndpoint: 'myHost',
                    user: 'zoe',
                    password: 'UW'
                });
            });

            it('will quit drop any existing table', async () => {

                connection.expect(/DROP TABLE/);

                await service.handleRequest(createRequest(), null);

                expect(connection.queries()).to.have.lengthOf(1);
                expect(connection.queries(0)).to.be.equal('DROP TABLE IF EXISTS `myTable`;');
                expect(lastLog).to.match(/Unexpected statement: CREATE TABLE/);
            });

            it('will quit create a new table', async () => {

                connection.expect(/DROP TABLE/);
                connection.expect(/CREATE TABLE/);

                await service.handleRequest(createRequest(), null);

                expect(connection.queries()).to.have.lengthOf(2);
                expect(connection.queries(1)).to.be.equal('CREATE TABLE myTable' +
                    ' (`Region` VARCHAR(40),`Country` VARCHAR(40),`Item Type` VARCHAR(40),' +
                    '`Sales Channel` VARCHAR(40),`Order Priority` VARCHAR(40),' +
                    '`Order Date` VARCHAR(40),`Order ID` INT PRIMARY KEY,' +
                    '`Ship Date` VARCHAR(40),`Units Sold` INT,`Unit Price` DOUBLE,' +
                    '`Unit Cost` DOUBLE,`Total Revenue` DOUBLE,`Total Cost` DOUBLE,' +
                    '`Total Profit` DOUBLE,`Order Processing Time` INT,' +
                    '`Gross Margin` FLOAT) ENGINE = MyISAM;');
                expect(lastLog).to.match(/Unexpected statement: INSERT/);
            });

            it('will insert everything in one batch if it is large enough', async () => {

                connection.expect(/DROP TABLE/);
                connection.expect(/CREATE TABLE/);
                connection.expect(/INSERT/);

                await service.handleRequest(createRequest(), null);

                expect(connection.queries()).to.have.lengthOf(3);
                expect(connection.queries(2)).to.be.equal('INSERT INTO myTable ' +
                    '(`Region`,`Country`,`Item Type`,`Sales Channel`,`Order Priority`,' +
                    '`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,`Unit Price`,' +
                    '`Unit Cost`,`Total Revenue`,`Total Cost`,`Total Profit`,' +
                    '`Order Processing Time`,`Gross Margin`) VALUES (A,B,,,,,,,,,,,,,,));' +
                    'INSERT INTO myTable (`Region`,`Country`,`Item Type`,`Sales Channel`,`Order Priority`,' +
                    '`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,`Unit Price`,`Unit Cost`,' +
                    '`Total Revenue`,`Total Cost`,`Total Profit`,`Order Processing Time`,`Gross Margin`)' +
                    ' VALUES (C,D,,,,,,,,,,,,,,));' +
                    'INSERT INTO myTable (`Region`,`Country`,`Item Type`,`Sales Channel`,`Order Priority`,' +
                    '`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,`Unit Price`,`Unit Cost`,' +
                    '`Total Revenue`,`Total Cost`,`Total Profit`,`Order Processing Time`,' +
                    '`Gross Margin`) VALUES (E,F,,,,,,,,,,,,,,));' +
                    'INSERT INTO myTable (`Region`,`Country`,`Item Type`,`Sales Channel`,' +
                    '`Order Priority`,`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,' +
                    '`Unit Price`,`Unit Cost`,`Total Revenue`,`Total Cost`,`Total Profit`,' +
                    '`Order Processing Time`,`Gross Margin`) VALUES (G,H,,,,,,,,,,,,,,));');

                expect(lastLog).to.not.match(/Unexpected statement/);
            });

            it('break things into batches when needed', async () => {

                connection.expect(/DROP TABLE/);
                connection.expect(/CREATE TABLE/);
                connection.expect(/INSERT/);
                connection.expect(/INSERT/);

                await service.handleRequest(createRequest({
                    batchSize: 3
                }), null);

                expect(connection.queries()).to.have.lengthOf(4);
                expect(connection.queries(2)).to.be.equal('INSERT INTO myTable ' +
                    '(`Region`,`Country`,`Item Type`,`Sales Channel`,`Order Priority`,' +
                    '`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,`Unit Price`,' +
                    '`Unit Cost`,`Total Revenue`,`Total Cost`,`Total Profit`,' +
                    '`Order Processing Time`,`Gross Margin`) VALUES (A,B,,,,,,,,,,,,,,));' +
                    'INSERT INTO myTable (`Region`,`Country`,`Item Type`,`Sales Channel`,`Order Priority`,' +
                    '`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,`Unit Price`,`Unit Cost`,' +
                    '`Total Revenue`,`Total Cost`,`Total Profit`,`Order Processing Time`,`Gross Margin`)' +
                    ' VALUES (C,D,,,,,,,,,,,,,,));' +
                    'INSERT INTO myTable (`Region`,`Country`,`Item Type`,`Sales Channel`,`Order Priority`,' +
                    '`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,`Unit Price`,`Unit Cost`,' +
                    '`Total Revenue`,`Total Cost`,`Total Profit`,`Order Processing Time`,' +
                    '`Gross Margin`) VALUES (E,F,,,,,,,,,,,,,,));');
                expect(connection.queries(3)).to.be.equal('INSERT INTO myTable (`Region`,`Country`,`Item Type`,`Sales Channel`,' +
                    '`Order Priority`,`Order Date`,`Order ID`,`Ship Date`,`Units Sold`,' +
                    '`Unit Price`,`Unit Cost`,`Total Revenue`,`Total Cost`,`Total Profit`,' +
                    '`Order Processing Time`,`Gross Margin`) VALUES (G,H,,,,,,,,,,,,,,));');

                expect(lastLog).to.not.match(/Unexpected statement/);

            });

        });

    });

});