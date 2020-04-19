const CsvWriter = require("../src/csvWriter");
const CsvColumns = require("../src/csvColumns");
const expect = require("chai").expect;

/**
 * Returns an array with 16 empty strings.
 *
 * @return {Array<String>}
 */
function emptyRecord() {
    let record = [];
    for (let i = 0; i < 16; i++) {
        record.push("");
    }
    return record;
}

function recordWith(...values) {
    let record = emptyRecord();
    for (let i = 0; i < values.length; i += 2) {
        record[values[i]] = values[i + 1]
    }
    return record;
}

/**
 *
 * @param {String} string
 * @return {Array<Array<String>>}
 */
function toRecords(string) {
    return string.split("\n").map(row => row.split(","));
}

describe("CsvWriter", () => {

    /**
     *
     */
    let logs;

    /**
     * @type {CsvWriter}
     */
    let csvWriter;

    beforeEach(() => {
        logs = [];
        csvWriter = new CsvWriter(logs.push.bind(logs));
    });

    it("Should add the appropriate headers to the first line", () => {
        let records = toRecords(csvWriter.write([(emptyRecord())]));

        expect(records).to.have.lengthOf(1);
        expect(records[0]).to.have.lengthOf(16);
        expect(records[0][CsvColumns.ORDER_PROCESSING_TIME]).to.be.equal("Order Processing Time");
        expect(records[0][CsvColumns.GROSS_MARGIN]).to.be.equal("Gross Margin");
    });

    it("should only process unique identifiers", () => {
        let records = toRecords(csvWriter.write([
            emptyRecord(),
            recordWith(CsvColumns.UNIQUE_ID, 1),
            recordWith(CsvColumns.UNIQUE_ID, 1),
            recordWith(CsvColumns.UNIQUE_ID, 2),
            recordWith(CsvColumns.UNIQUE_ID, 2),
            recordWith(CsvColumns.UNIQUE_ID, 3),
        ]));

        expect(records).to.have.lengthOf(4);
    });

    it("should rewrite the priority when possible", () => {
        let records = toRecords(csvWriter.write([
            emptyRecord(),
            recordWith(CsvColumns.UNIQUE_ID, 1, CsvColumns.PRIORITY, "H"),
            recordWith(CsvColumns.UNIQUE_ID, 2, CsvColumns.PRIORITY, "M"),
            recordWith(CsvColumns.UNIQUE_ID, 3, CsvColumns.PRIORITY, "L"),
            recordWith(CsvColumns.UNIQUE_ID, 4, CsvColumns.PRIORITY, "C"),
            recordWith(CsvColumns.UNIQUE_ID, 5, CsvColumns.PRIORITY, "X"),
        ]));

        expect(records).to.have.lengthOf(6);
        expect(records[1][CsvColumns.PRIORITY]).to.be.equal("High");
        expect(records[2][CsvColumns.PRIORITY]).to.be.equal("Medium");
        expect(records[3][CsvColumns.PRIORITY]).to.be.equal("Low");
        expect(records[4][CsvColumns.PRIORITY]).to.be.equal("Critical");
        expect(records[5][CsvColumns.PRIORITY]).to.be.equal("X");
    });

    it("should calculate order processing time", () => {
        let records = toRecords(csvWriter.write([
            // Header row.
            emptyRecord(),
            // Same date.
            recordWith(CsvColumns.UNIQUE_ID, 1, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "01/01/2010"),
            // Ten years apart.
            recordWith(CsvColumns.UNIQUE_ID, 2, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "01/01/2020"),
            // One month apart.
            recordWith(CsvColumns.UNIQUE_ID, 3, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "02/01/2010"),
            // One day apart.
            recordWith(CsvColumns.UNIQUE_ID, 4, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "01/02/2010"),
            // One year, two month, and three days apart.
            recordWith(CsvColumns.UNIQUE_ID, 5, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "03/04/2011"),
        ]));

        expect(records).to.have.lengthOf(6);

        // Same date.
        expect(records[1][CsvColumns.ORDER_PROCESSING_TIME]).to.be.equal("0");

        // Ten years apart.
        expect(records[2][CsvColumns.ORDER_PROCESSING_TIME]).to.be.equal("3650");

        // One month apart.
        expect(records[3][CsvColumns.ORDER_PROCESSING_TIME]).to.be.equal("30");

        // One day apart.
        expect(records[4][CsvColumns.ORDER_PROCESSING_TIME]).to.be.equal("1");

        // One year, two month, and three days apart.
        expect(records[5][CsvColumns.ORDER_PROCESSING_TIME]).to.be.equal("428");
    });

    it("should calculate the gross margin", () => {
        let records = toRecords(csvWriter.write([
            emptyRecord(),
            recordWith(CsvColumns.PROFIT, "456", CsvColumns.REVENUE, "1000")
        ]));

        expect(records).to.have.lengthOf(2);
        expect(records[1][CsvColumns.GROSS_MARGIN]).to.be.equal("0.456");
    });


    it("should log the processing time and gross margin", () => {
        toRecords(csvWriter.write([
            // Header row.
            emptyRecord(),
            // Same date.
            recordWith(CsvColumns.UNIQUE_ID, 1, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "01/01/2010", CsvColumns.PROFIT, "123", CsvColumns.REVENUE, "1000"),
            // Ten years apart.
            recordWith(CsvColumns.UNIQUE_ID, 2, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "01/01/2020", CsvColumns.PROFIT, "234", CsvColumns.REVENUE, "1000"),
            // One month apart.
            recordWith(CsvColumns.UNIQUE_ID, 3, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "02/01/2010", CsvColumns.PROFIT, "345", CsvColumns.REVENUE, "1000"),
            // One day apart.
            recordWith(CsvColumns.UNIQUE_ID, 4, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "01/02/2010", CsvColumns.PROFIT, "456", CsvColumns.REVENUE, "1000"),
            // One year, two month, and three days apart.
            recordWith(CsvColumns.UNIQUE_ID, 5, CsvColumns.DATE_STARTED, "01/01/2010", CsvColumns.DATE_FINISHED, "03/04/2011", CsvColumns.PROFIT, "567", CsvColumns.REVENUE, "1000"),
        ]));

        expect(logs).to.have.lengthOf(10);

        expect(logs[0]).to.be.equal("0");
        expect(logs[1]).to.be.equal("0.123");

        expect(logs[2]).to.be.equal("3650");
        expect(logs[3]).to.be.equal("0.234");

        expect(logs[4]).to.be.equal("30");
        expect(logs[5]).to.be.equal("0.345");

        expect(logs[6]).to.be.equal("1");
        expect(logs[7]).to.be.equal("0.456");

        expect(logs[8]).to.be.equal("428");
        expect(logs[9]).to.be.equal("0.567");
    });

});