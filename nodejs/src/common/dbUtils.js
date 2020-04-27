const DbColumns = require("./dbColumns");
const CsvUtils = require("./csvUtils");

class DbUtils {

    /**
     * @param {Object} record
     * @return {Array<String>}
     */
    static fromRecord(record) {
        let values = [];
        DbColumns.all().filter(c => typeof record[c.name] !== 'undefined').forEach(c => {
            values.push(c.index);
            values.push(record[c.name]);
        });
        return CsvUtils.recordWith(...values);
    }

}

module.exports = DbUtils;