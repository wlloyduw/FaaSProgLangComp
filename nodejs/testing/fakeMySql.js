/**
 * @type {FakeConnection[]}
 */
let connections = [];

let objEqualsLeftToRight = (first, second) => {
    return typeof Object.keys(first).find(key => first[key] !== second[key]) === 'undefined';
};

let objEquals = (first, second) => {
    return objEqualsLeftToRight(first, second) && objEqualsLeftToRight(second, first);
};

class FakeMySql {

    static reset() {
        connections = [];
    }

    static expectConnection(options) {
        let connection = new FakeConnection(options);
        connections.push(connection);
        return connection;
    }

    /**
     * @param {ConnectionConfig} options
     * @returns {FakeConnection}
     */
    static createConnection(options) {
        return new Promise((resolve, reject) => {
            if (connections.length === 0) {
                reject(new Error("Unexpected connection"));
            } else if (objEquals(options, connections[0]._config)) {
                reject(new Error("Unexpected connection"));
            } else {
                resolve(connections.pop());
            }
        });
    }

    /**
     * @param {String} template
     * @param {Array<Object>} values
     */
    static format(template, values) {
        // We do NOT handle identifier placeholders (i.e. ??).
        let parts = template.split("?");
        if (values.length !== parts.length - 1) {
            throw Error("Expected " + (parts.length - 1) + " values but got " + values.length);
        }
        let formatted = [];
        for (let i = 0; i < parts.length; i++) {
            formatted.push(parts[i]);
            formatted.push(values[i]);
        }
        formatted.push(parts[parts.length - 1]);
        return formatted.join("");
    }

}

class FakeConnection {

    /**
     * @type {ConnectionConfig}
     */
    _config;

    /**
     * @type Array<String>
     */
    _queries;

    /**
     * @type Array<RegExp>
     */
    _expectations;

    /**
     * @param {ConnectionConfig} config
     */
    constructor(config) {
        this._config = config;
        this._queries = [];
        this._expectations = [];
    }

    /**
     * @param {RegExp} pattern
     */
    expect(pattern) {
        this._expectations.push(pattern);
    }

    query(sql) {
        return new Promise((resolve, reject) => {
            if (this._expectations.length === 0 || !this._expectations[0].test(sql)) {
                reject(new Error("Unexpected statement"));
            } else {
                this._expectations.splice(0, 1);
                this._queries.push(sql);
                resolve(true);
            }
        });
    }

    /**
     * @param {Number} [index]
     * @return {String|Array<String>}
     */
    queries(index) {
        if (typeof index !== 'undefined') {
            return this._queries[index];
        }
        return this._queries;
    }

    end() {
        return new Promise((resolve, reject) => {
            if (this._expectations.length > 0) {
                reject(new Error("Unmet expectations: " + this._expectations));
            } else {
                resolve(true);
            }
        })
    }

}

module.exports = FakeMySql;