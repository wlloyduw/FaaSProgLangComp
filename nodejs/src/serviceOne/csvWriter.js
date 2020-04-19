const CsvColumns = require('./csvColumns');

/**
 * @typedef DateRecord
 * @property {number} year
 * @property {number} month
 * @property {number} day
 */

/**
 * Writes CSV values read from {@link CsvReader} to a string.
 */
class CsvWriter {

    /**
     * @type {function(string):void}
     */
    #logger;

    /**
     * @param {function(string):void} logger
     */
    constructor(logger) {
        this.#logger = logger;
    }

    /**
     * @param {Array<Array<String>>} records
     * @return {String}
     */
    write(records) {
        /**
         * We use an array to accumulate the result, because the performance of
         * pushing in an array and at the end producing the concatenated string is
         * the same as using a string buffer in Java and producing the final String
         * at the end.
         *
         * @type {string[]}
         */
        let result = [];

        /**
         *
         * @type {{number:number}}
         */
        let uniqueIds = {};

        // Set the two last headers. The CSV reader adds two zeros to each record
        // read, including the header row. So, we should rewrite that one to reflect
        // the actual header for the last two columns.
        records[0][CsvColumns.ORDER_PROCESSING_TIME] = "Order Processing Time";
        records[0][CsvColumns.GROSS_MARGIN] = "Gross Margin";

        // Add the header row to the result.
        result.push(records[0].join(","));

        // Read the records and write the output.
        try {
            for (let i = 1; i < records.length; i++) {
                let record = records[i];
                let uniqueId = parseInt(record[CsvColumns.UNIQUE_ID]);
                // If we have already processed a record with this ID, skip it.
                if (typeof uniqueIds[uniqueId] !== 'undefined') {
                    continue;
                }

                // Make sure we remember that we have seen this ID.
                uniqueIds[uniqueId] = uniqueId;

                // Rewrite the priority of the record from letter-based index to the priority level name,
                // e.g. rewrite H to HIGH.
                record[CsvColumns.PRIORITY] = this._getPriorityName(record[CsvColumns.PRIORITY]);

                // Set the order time for the record based on the duration between the time the order was
                // started and the time it was done, in days.
                record[CsvColumns.ORDER_PROCESSING_TIME] = String(this._timeDiff(this._strToDate(record[CsvColumns.DATE_STARTED]), this._strToDate(record[CsvColumns.DATE_FINISHED])));

                // Set the gross margin, defined as profit / revenue.
                record[CsvColumns.GROSS_MARGIN] = String(parseFloat(record[CsvColumns.PROFIT]) / parseFloat(record[CsvColumns.REVENUE]));

                // Log the two calculated values.
                this.#logger.call(null, record[CsvColumns.ORDER_PROCESSING_TIME]);
                this.#logger.call(null, record[CsvColumns.GROSS_MARGIN]);

                // Add the modified record to the output.
                result.push(record.join(","));
            }
        } catch (e) {
            throw Error("Can't parse file " + (typeof e === 'string' ? e : e.message));
        }
        return result.join("\n");
    }

    /**
     * @param {string} priority
     * @return {string}
     * @private
     */
    _getPriorityName(priority) {
        switch (priority) {
            case "C":
                return "Critical";
            case "L":
                return "Low";
            case "M":
                return "Medium";
            case "H":
                return "High";
            default:
                return priority;
        }
    }

    /**
     * @param {String} string
     * @return {DateRecord}
     * @private
     */
    _strToDate(string) {
        let split = string.split("/");
        return {
            year: parseInt(split[2]),
            month: parseInt(split[0]),
            day: parseInt(split[1])
        };
    }

    /**
     * @param {DateRecord} from
     * @param {DateRecord} to
     * @return {number}
     * @private
     */
    _timeDiff(from, to) {
        return (to.year - from.year) * 365 + (to.month - from.month) * 30 + (to.day - from.day);
    }

}

module.exports = CsvWriter;