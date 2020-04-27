const expect = require("chai").expect;
const DbUtils = require('../../src/common/dbUtils');
const DbColumns = require('../../src/common/dbColumns');
const CsvUtils = require('../../src/common/csvUtils');
const CsvColumns = require('../../src/common/csvColumns');

describe("DbUtils", () => {

    describe(".fromObject(object)", () => {

        it("returns an array with 16 elements", () => {
            expect(DbUtils.fromObject({})).to.have.lengthOf(16);
            DbUtils.fromObject({}).forEach(value => {
                expect(value).to.be.empty;
            });
        });

        it("sets the right indices", () => {
            let record = {};
            record[DbColumns.COST.name] = "abc";
            record[DbColumns.PROFIT.name] = "def";
            let row = DbUtils.fromObject(record);
            expect(row[DbColumns.COST.index]).to.be.equal("abc");
            expect(row[DbColumns.PROFIT.index]).to.be.equal("def");
        });

        it("does not set irrelevant indices", () => {
            DbUtils.fromObject({
                "a": "1",
                "b": "2"
            }).forEach(value => {
                expect(value).to.be.empty;
            });
        });

    });

    describe(".toObject(string[])", () => {

        it("returns an object with 16 keys", () => {
            expect(Object.keys(DbUtils.toObject([]))).to.have.lengthOf(16);
        });

        it("returns an object that has keys for each column name", () => {
            let object = DbUtils.toObject([]);
            DbColumns.all().forEach(column => {
                expect(object.hasOwnProperty(column.name)).to.be.true;
            });
        });

        it("assigns the right values", () => {
            let object = DbUtils.toObject(CsvUtils.recordWith(CsvColumns.COST, "0.123", CsvColumns.COUNTRY, "Iran"));
            expect(object[DbColumns.COST.name]).to.be.equal("0.123");
            expect(object[DbColumns.COUNTRY.name]).to.be.equal("Iran");
        });

    });

});