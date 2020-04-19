const CsvReader = require("../src/csvReader");
const expect = require("chai").expect;

describe("CsvReader", () => {

    let reader;
    let logs;

    beforeEach(() => {
        logs = [];
        reader = new CsvReader(logs.push.bind(logs));
    });

    it("should read a buffer, line-by-line", async () => {
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

    it("should log each entry", async () => {
        let buffer = Buffer.from("Hello\nWorld,Friend");
        await reader.read(buffer);

        expect(logs).to.have.lengthOf(2);
        expect(logs[0]).to.equal("Hello,0,0");
        expect(logs[1]).to.equal("World,Friend,0,0");
    });

});