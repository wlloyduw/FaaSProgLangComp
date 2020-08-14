const readline = require('readline');
const stream = require('stream');

/**
 * A reader that takes a buffer of text and interprets each line of it as a comma-separated value.
 */
class CsvReader {

    /**
     * @type {function(string):void}
     */
    _logger;

    /**
     * @param {function(string):void} logger
     */
    constructor(logger) {
        this._logger = logger;
    }

    /**
     * Reads the contents of a buffer line by line.
     * @param {Buffer} buffer
     * @return {Promise<Array<Array<String>>>}
     */
    read(buffer) {
        return new Promise((resolve, reject) => {
            // Create a pass-through stream from the input buffer.
            let passThrough = new stream.PassThrough();
            passThrough.end(buffer);
            // Create a reader that can read the stream line by line.
            let reader = readline.createInterface({
                input: passThrough
            });
            // Set up the array of records.
            let records = [];
            // For every line read from the stream, do this.
            reader.on('line', (line) => {
                // Log the line read from the input.
                this._logger.call(null, line);
                // Split the line by commas, and push the result to the records array.
                records.push(line.split(','));
            });
            // If we encounter errors when reading the stream, reject the promise.
            reader.on('error', (error) => reject(error));
            // If we reach the end of the stream, resolve the promise.
            reader.on('close', () => resolve(records));
        });
    }

}

module.exports = CsvReader;