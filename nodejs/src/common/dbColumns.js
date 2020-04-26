const CsvColumns = require('./csvColumns');

class DbColumn {

    /**
     * @type {String}
     */
    _name;

    /**
     * @type {Number}
     */
    _index;

    /**
     * @type {String}
     */
    _type;

    /**
     * @type {Boolean}
     */
    _key;

    constructor(name, index, type, key) {
        this._name = name;
        this._index = index;
        this._type = type;
        this._key = key;
    }


    get name() {
        return this._name;
    }

    get identifier() {
        return '`' + this.name + '`';
    }

    get index() {
        return this._index;
    }

    definition() {
        return '`' + this.name + '` ' + this._type + (this._key ? ' PRIMARY KEY' : '');
    }

}

class DbColumns {
    static REGION = new DbColumn("Region", CsvColumns.REGION, "VARCHAR(40)", false);
    static COUNTRY = new DbColumn("Country", CsvColumns.COUNTRY, "VARCHAR(40)", false);
    static ITEM_TYPE = new DbColumn("Item Type", CsvColumns.ITEM_TYPE, "VARCHAR(40)", false);
    static SALES_CHANNEL = new DbColumn("Sales Channel", CsvColumns.SALES_CHANNEL, "VARCHAR(40)", false);
    static PRIORITY = new DbColumn("Order Priority", CsvColumns.PRIORITY, "VARCHAR(40)", false);
    static DATE_STARTED = new DbColumn("Order Date", CsvColumns.DATE_STARTED, "VARCHAR(40)", false);
    static UNIQUE_ID = new DbColumn("Order ID", CsvColumns.UNIQUE_ID, "INT", true);
    static DATE_FINISHED = new DbColumn("Ship Date", CsvColumns.DATE_FINISHED, "VARCHAR(40)", false);
    static UNITS_SOLD = new DbColumn("Units Sold", CsvColumns.UNITS_SOLD, "INT", false);
    static UNIT_PRICE = new DbColumn("Unit Price", CsvColumns.UNIT_PRICE, "DOUBLE", false);
    static UNIT_COST = new DbColumn("Unit Cost", CsvColumns.UNIT_COST, "DOUBLE", false);
    static REVENUE = new DbColumn("Total Revenue", CsvColumns.REVENUE, "DOUBLE", false);
    static COST = new DbColumn("Total Cost", CsvColumns.COST, "DOUBLE", false);
    static PROFIT = new DbColumn("Total Profit", CsvColumns.PROFIT, "DOUBLE", false);
    static ORDER_PROCESSING_TIME = new DbColumn("Order Processing Time", CsvColumns.ORDER_PROCESSING_TIME, "INT", false);
    static GROSS_MARGIN = new DbColumn("Gross Margin", CsvColumns.GROSS_MARGIN, "FLOAT", false);

    /**
     * @return {DbColumn[]}
     */
    static all() {
        return Object.keys(DbColumns).filter(key => DbColumns[key] instanceof DbColumn).map(key => DbColumns[key]).sort((first, second) => first.index < second.index);
    }

}

module.exports = DbColumns;