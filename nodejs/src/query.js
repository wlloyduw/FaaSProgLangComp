/**
 * 
 */

// Import modules
const mysql = require("mysql");
//const fs = require("fs");
//const parse = require("csv-parse/lib/sync");
const async = require("async");


//
//Service 3: query
//

module.exports = function(request, context, callback) {
	
	const inspector = new (require('./Inspector'))();
    inspector.addAttribute("message", "querying...");

    // validations check up
    let fields = [];
    
    if (request.hasOwnProperty("region")) {
    	fields["region"] = request["region"];
    }
        
    if (request.hasOwnProperty("item_type")) {
    	fields["item_type"] = request["item_type"];
    }
    
    if (request.hasOwnProperty("sales_channel")) {
    	fields["sales_channel"] = request["sales_channel"];
    }
    
    if (request.hasOwnProperty("order_priority")) {
    	fields["order_priority"] = request["order_priority"];
    }
    
    if (request.hasOwnProperty("country")) {
    	fields["country"] = request["country"];
    }
    
	// Connect to database
	let connection = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "yhf3012523",
		port: "3306",
		database: "sales"
	})
	
	connection.connect();
	console.log("Login database");
	console.log("Executing queries...");
	
	// Execute query operation
	let result = add_full_data_set(connection, fields);
	//console.log(result);  
	connection.end();
	
	inspector.addAttribute("response", result);

	inspector.inspectAllDeltas();
	return inspector.finish();
}

function add_full_data_set(connection, fields) {
	let query_string = "select sr.* from sales_records sr";
	let keys_list = [];
    for (let property in fields) {
        keys_list.push(property);
    }
    
    if (keys_list.length > 0) {
    	query_string = query_string + " where sr." + keys_list[0] + "='" + fields[keys_list[0]] + "' ";
    	for (let i=1; i<keys_list.length; i++) {
            query_string = query_string + "and sr." + keys_list[i] + "='" + fields[keys_list[i]] + "' ";
    	}
    }
    query_string = query_string + ";";
    
    return new Promise(function (resolve, reject) {
	    connection.query(query_string, function (err, rows) {
	    	if (err) {
	    		reject("Error: add_full_data_set");
	    	} else {
	    		let result = [];
	    		let resultset = [];
	    		
	    		for (let row of rows) {
			        row['order_id'] = parseInt(row['order_id']);
			        row['order_date'] = String(row['order_date']);
			        row['ship_date'] = String(row['ship_date']);
			        row['unit_sold'] = parseInt(row['unit_sold']);
			        row['unit_price'] = parseFloat(row['unit_price']);
			        row['unit_cost'] = parseFloat(row['unit_cost']);
			        row['total_revenue'] = parseFloat(row['total_revenue']);
			        row['total_cost'] = parseFloat(row['total_cost']);
			        row['total_profit'] = parseFloat(row['total_profit']);
			        row['order_processing_time'] = parseInt(row['order_processing_time']);
			        row['gross_margin'] = parseFloat(row['gross_margin']);
			        resultset.push(row);
	    		}	  
	    		
	    		result["result_set"] = resultset;
	    		resolve(result);
	    	}
	    });
    });
}