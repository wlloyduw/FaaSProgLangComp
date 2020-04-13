const CsvReader = require("../src/csvReader");
const expect = require("chai").expect;

describe("CsvReader", () => {

    it("should read a buffer, line-by-line", async () => {
        let reader = new CsvReader();
        let buffer = Buffer.from("Hello\nWorld,Friend");
        let records = await reader.read(buffer);

        // It should read one line for each distinct line of text in the buffer.
        expect(records).to.have.lengthOf(2);

        // The first line should be "Hello" + artificially added "0,0" split by ",".
        expect(records[0]).to.have.lengthOf(3);
        expect(records[0][0]).to.equal("Hello");
        expect(records[0][1]).to.equal("0");
        expect(records[0][2]).to.equal("0");

        // The second line should be "World,Friend" + artificially added "0,0" split by ",".
        expect(records[1]).to.have.lengthOf(4);
        expect(records[1][0]).to.equal("World");
        expect(records[1][1]).to.equal("Friend");
        expect(records[1][2]).to.equal("0");
        expect(records[1][3]).to.equal("0");
    });

});