const expect = require("chai").expect;
const DbUtils = require('../../src/common/dbUtils');
const DbColumns = require('../../src/common/dbColumns');

describe("DbUtils", () => {

    describe(".fromRecord()", () => {

        it("returns an array with 16 elements", () => {
            expect(DbUtils.fromRecord({})).to.have.lengthOf(16);
            DbUtils.fromRecord({}).forEach(value => {
                expect(value).to.be.empty;
            });
        });

        it("sets the right indices", () => {
            let record = {};
            record[DbColumns.COST.name] = "abc";
            record[DbColumns.PROFIT.name] = "def";
            let row = DbUtils.fromRecord(record);
            expect(row[DbColumns.COST.index]).to.be.equal("abc");
            expect(row[DbColumns.PROFIT.index]).to.be.equal("def");
        });

        it("does not set irrelevant indices", () => {
            DbUtils.fromRecord({
                "a": "1",
                "b": "2"
            }).forEach(value => {
                expect(value).to.be.empty;
            });
        });

    });

});