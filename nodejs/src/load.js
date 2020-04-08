/**
 * 
 */

// Import modules
const mysql = require("mysql");
//const fs = require("fs");
//const parse = require("csv-parse/lib/sync");
//const async = require("async");

// Set up configuration
var config = [];
config["db_port"] = "3306";
config["db_host"] = "localhost";
config["db_user"] = "root";
config["db_passwd"] = "yhf3012523";


//
//Service 2: load
//

module.exports = function(request, context) {
    
    const inspector = new (require('./Inspector'))();
    inspector.inspectAll();

    inspector.addAttribute("message", "loading...");

    // Validations check up
    //if ("csv_file_name" not in request) {

    var file_name = request["csv_file_name"];
	
	// Connect to database
	let connection = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "yhf3012523",
		port: "3306"
	})
	
	connection.connect();
	console.log("Login database");
	
	insert_CSV_into_database(connection, "/tmp/" + "processed_" + file_name);
	connection.commit();
	connection.end();
	
	inspector.addAttribute("response", "load succeed");
    
    inspector.inspectAllDeltas();
    return inspector.finish();
};


function insert_CSV_into_database(connection, file_path) {
	let file = fs.readFileSync(file_path);
	let json_file = parse(file, {
	    columns: true,
	    skip_empty_lines: true
	});
	
	for (let i=0; i<json_file.length; i++) {
		let order_date_list = json_file[i]["Order Date"].split("/");
		let order_date = order_date_list[2] + "-" + order_date_list[0] + "-" + order_date_list[1];
		
		let ship_date_list = json_file[i]["Ship Date"].split("/");
		let ship_date = ship_date_list[2] + "-" + ship_date_list[0] + "-" + ship_date_list[1];
		
		let insert_value = "insert into sales.sales_records\n" +
				"(" +
				"order_id, " +
				"region, " +
				"country, " +
				"item_type, " +
				"sales_channel, " +
				"order_priority, " +
				"order_date, " +
				"ship_date, " +
				"unit_sold, " +
				"unit_price, " +
				"unit_cost, " +
				"total_revenue, " +
				"total_cost, " +
				"total_profit, " +
				"order_processing_time, " +
				"gross_margin" +
				")\n" +
				"values" +
				"(" +
				"\"" + json_file[i]["Order ID"] + "\", " + 
				"\"" + json_file[i]["Region"] + "\", " +
				"\"" + json_file[i]["Country"] + "\", " +
				"\"" + json_file[i]["Item Type"] + "\", " +
				"\"" + json_file[i]["Sales Channel"] + "\", " +
				"\"" + json_file[i]["Order Priority"] + "\", " +
				"\"" + order_date + "\", " +
				"\"" + ship_date + "\", " +
				"\"" + json_file[i]["Units Sold"] + "\", " +
				"\"" + json_file[i]["Unit Price"] + "\", " +
				"\"" + json_file[i]["Unit Cost"] + "\", " +
				"\"" + json_file[i]["Total Revenue"] + "\", " +
				"\"" + json_file[i]["Total Cost"] + "\", " +
				"\"" + json_file[i]["Total Profit"] + "\", " +
				"\"" + json_file[i]["Order Processing Time"] + "\", " +
				"\"" + json_file[i]["Gross Margin"] + "\"" +
				");";
		connection.query(insert_value);
	}
}