const DbColumns = require("./dbColumns");
const CsvUtils = require("./csvUtils");

class DbUtils {

    /**
     * @param {Object} object
     * @return {Array<String>}
     */
    static fromObject(object) {
        let values = [];
        DbColumns.all().filter(c => typeof object[c.name] !== 'undefined').forEach(c => {
            values.push(c.index);
            values.push(object[c.name]);
        });
        return CsvUtils.recordWith(...values);
    }

    /**
     * @param {Array<String>} record
     * @return {Object}
     */
    static toObject(record) {
        return DbColumns.all().reduce((object, column) => {
            object[column.name] = record[column.index];
            return object;
        }, {});
    }

}

module.exports = DbUtils;