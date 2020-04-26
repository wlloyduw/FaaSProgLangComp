const ServiceOne = require('../../src/serviceOne/serviceOne');
const FakeS3 = require('../../testing/fakeS3');
const expect = require('chai').expect;
const sinon = require('sinon');
const CsvUtils = require("../../testing/csvUtils");
const CsvColumns = require("../../src/common/csvColumns");

describe("ServiceOne", () => {

    const sandbox = sinon.createSandbox();

    /**
     * @type {FakeS3}
     */
    let fakeS3;

    /**
     * @type {ServiceOne}
     */
    let service;

    /**
     * @type {number}
     */
    let lastTag;

    let uuid = "abcd-1234-efgh-5678";

    beforeEach(() => {
        fakeS3 = new FakeS3();
        sandbox.spy(fakeS3, 'getObject');
        sandbox.spy(fakeS3, 'putObject');
        lastTag = 0;
        service = new ServiceOne(() => {}, fakeS3, () => lastTag++, () => uuid);
    });

    afterEach(() => {
        sandbox.restore();
    });

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
        expect(fakeS3.putObject.called).to.be.false;
    });

    it('will upload a file with the processed input', async () => {
        let input = [
            CsvUtils.emptyRecord(),
            CsvUtils.recordWith(CsvColumns.PROFIT, "123", CsvColumns.REVENUE, "1000")
        ];
        fakeS3.putObject({
            Bucket: 'bucket1',
            Key: 'myCsvFile.csv',
            Body: Buffer.from(CsvUtils.fromRecords(input))
        });

        sandbox.reset();

        await service.handleRequest({
            bucketName: 'bucket1',
            key: 'myCsvFile.csv'
        }, null);

        expect(fakeS3.putObject.calledOnce).to.be.true;
        expect(fakeS3.putObject.getCall(0).args).to.have.lengthOf(1);
        expect(fakeS3.putObject.getCall(0).args[0]).to.have.property('Bucket', 'bucket1');
        expect(fakeS3.putObject.getCall(0).args[0]).to.have.property('Key', `myCsvFile/${lastTag - 1}_${uuid}.csv`);
    });

});