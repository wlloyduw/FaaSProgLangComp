const expect = require("chai").expect;
const CsvUtils = require('../../src/common/csvUtils');

describe("CsvUtils", () => {

    describe(".emptyRecord()", () => {

        it("returns an array with 16 elements", () => {
            expect(CsvUtils.emptyRecord()).to.have.lengthOf(16);
        });

        it("returns an array where every element is the empty string", () => {
            CsvUtils.emptyRecord().forEach(value => {
                expect(value).to.be.empty;
            });
        });

        it("returns a different record each time", () => {
            let first = CsvUtils.emptyRecord();
            let second = CsvUtils.emptyRecord();
            expect(first).not.to.be.equal(second);
            first[0] = "x";
            expect(second[0]).not.to.be.equal(first[0]);
        });

    });

    describe(".toRecords(string)", () => {

        it("returns a row for each line of text", () => {
            expect(CsvUtils.toRecords("a\nb")).to.have.lengthOf(2);
        });

        it("returns a cell for each comma-separated value", () => {
            let records = CsvUtils.toRecords("a,b,c\n1,2");
            expect(records).to.have.lengthOf(2);
            expect(records[0]).to.have.lengthOf(3);
            expect(records[0][0]).to.be.equal("a");
            expect(records[0][1]).to.be.equal("b");
            expect(records[0][2]).to.be.equal("c");
            expect(records[1]).to.have.lengthOf(2);
            expect(records[1][0]).to.be.equal("1");
            expect(records[1][1]).to.be.equal("2");
        });

    });

    describe(".fromRecords(any[][])", () => {

        it("returns a single string", () => {
            expect(CsvUtils.fromRecords([])).to.be.a('string');
        });

        it("assembles the rows into separate lines", () => {
            expect(CsvUtils.fromRecords([[],[]]).split('\n')).to.have.lengthOf(2);
        });

        it("prepares a CSV from the records", () => {
            expect(CsvUtils.fromRecords([[1, 2, 3],['a', 'b']])).to.be.equal('1,2,3\na,b');
        });

    });

    describe(".recordWith(index, value, index, value, ...)", () => {

        it("returns a record with 16 cells", () => {
            expect(CsvUtils.recordWith()).to.have.lengthOf(16);
        });

        it("sets the values of the correct cells", () => {
            let record = CsvUtils.recordWith(1, "a", 13, "b");
            expect(record[1]).to.be.equal("a");
            expect(record[13]).to.be.equal("b");
        });

        it("does not set values for invalid indices", () => {
            let record = CsvUtils.recordWith(100, "a", -1, "b");
            expect(record).to.have.lengthOf(16);
        });

    });

});