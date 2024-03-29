class CsvUtils {

    /**
     * Returns an array with 16 empty strings.
     *
     * @return {Array<String>}
     */
    static emptyRecord() {
        let record = [];
        for (let i = 0; i < 16; i++) {
            record.push("");
        }
        return record;
    }

    /**
     * @param {...*} values
     * @return {Array<String>}
     */
    static recordWith(...values) {
        let record = CsvUtils.emptyRecord();
        for (let i = 0; i < values.length; i += 2) {
            let index = values[i];
            if (index < 0 || index >= record.length) {
                continue;
            }
            record[index] = values[i + 1]
        }
        return record;
    }

    /**
     *
     * @param {String} string
     * @return {Array<Array<String>>}
     */
    static toRecords(string) {
        return string.split("\n").map(row => row.split(","));
    }

    /**
     * @param {Array<Array<String>>} records
     * @return {String}
     */
    static fromRecords(records) {
        return records.map(record => record.join(",")).join("\n");
    }

}

module.exports = CsvUtils;