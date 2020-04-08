/**
 * @Auther: Hanfei Yu
 */

const fs = require("fs");
const req = require("request");
const parse = require("csv-parse/lib/sync");
const aws = require('aws-sdk');

//
// Setting Variables
//

const PROCESSED_NAME = "processed_";
const TEMP_DIRECTORY = "/tmp/";
const PROJECT_BUCKET = "tcss562.tlq.bucket";
const LOCATION_CONSTRAINT = "us-east-1";

const TITLE = ["Region", "Country", "Item Type", "Sales Channel", 
	"Order Priority", "Order Date", "Order ID", "Ship Date", 
	"Units Sold", "Unit Price", "Unit Cost", "Total Revenue", 
	"Total Cost", "Total Profit", "Order Processing Time", "Gross Margin"];

//Set up database configuration
const config = [];
config["db_port"] = "3306";
config["db_host"] = "localhost";
config["db_user"] = "root";
config["db_passwd"] = "yhf3012523";
config["db_name"] = "sales";


//
// Define functions of transformation
//
	
function orderProcessingTime(ship_date, order_date) {
    let date1 = order_date.split("/");
    let date2 = ship_date.split("/");
    
    for (let i=0; i<date1.length; i++) {
        date1[i] = parseInt(date1[i]);
        date2[i] = parseInt(date2[i]);
    }
    
    let order_processing_time = (date2[2] - date1[2])*365 + (date2[0] - date1[0])*30 + (date2[1] - date1[1]);
    
    return order_processing_time.toString();
}

function orderPriority(letter) {
    switch (letter) {
        case "L":
            return "Low";
        case "M":
            return "Medium";
        case "H":
            return "High";
        case "C":
            return "Critical";
        default:
            return "Error";
	    }
	}
	
function grossMargin(total_profit, total_revenue) {
    let gross_margin = parseFloat(total_profit) / parseFloat(total_revenue);
    return gross_margin.toFixed(2).toString();
}

function isDupOrderID(id_list, order_id) {
    if (id_list == null) {
        return false;
    }
    
    for (let i=0; i<id_list.length; i++) {
        if (id_list[i] == order_id) {
            return true;
        }
    }

    return false;
}

function generate_new_csv_file(file_path) {
	let csv_input = fs.readFileSync(file_path);
	
	// CSV to JSON
	let json_input = parse(csv_input, {
	    columns: true,
	    skip_empty_lines: true
	});
	    
	// List of processed Order ID
	let processed_id_list = [];
	    
	// Start processing
	for (let i=0; i<json_input.length; i++) {
	        
	    // Remove duplicate Order ID items
	    if (isDupOrderID(processed_id_list, json_input[i]["Order ID"]) == true) { 
	        json_input.splice(i, 1);
	        i--;
	        continue;
	    } else {
	        processed_id_list.push(json_input[i]["Order ID"]);
	    }
	    
	    // Correct Order Priority
	    json_input[i]["Order Priority"] = orderPriority(json_input[i]["Order Priority"]);
	    
	    // Compute Gross Margin
	    json_input[i]["Gross Margin"] = grossMargin(json_input[i]["Total Profit"], json_input[i]["Total Revenue"]);
	    
	    // Compute Order Processing Time
	    json_input[i]["Order Processing Time"] = orderProcessingTime(json_input[i]["Ship Date"], json_input[i]["Order Date"]);
	}
	    
	let csv_output = [];
	csv_output.push(TITLE);
	    
	// Write new CSV output file
	for (let i=0; i<json_input.length; i++) {
	    let csv_output_row = [];            
	    
	    for (let j=0; j<TITLE.length; j++) {
	        csv_output_row.push(json_input[i][TITLE[j]]);
	    }
	    
	    csv_output_row[0] = "\r" + csv_output_row[0]; 
	    csv_output.push(csv_output_row);
	}
	csv_output.push(csv_output.pop().push(""));
	
	
	let file_name = get_file_name_from_string(file_path);
	let processed_file_name = PROCESSED_NAME + file_name;
	let processed_file_path = TEMP_DIRECTORY + processed_file_name;
	    
	fs.writeFileSync(processed_file_path, '\ufeff' + csv_output, {encoding: 'utf8'});
	
	console.log("Finish processing " + file_name);
	return processed_file_path;
}


//
// Preparations
//

function get_file_name_from_string(url) {
	let list = (url || "").split("/");
    return list.pop();	
}

function download_file(url) {
    let file_name = get_file_name_from_string(url);
    let file_path = TEMP_DIRECTORY + file_name;
    
	if (!fs.existsSync(file_path)) {
        console.log(file_name + " does not exist.");

        let stream = fs.createWriteStream(file_path);
        console.log("Retrieving HTTP meta-data...");
        req(url).pipe(stream).on("close", function (err) {
            console.log("[" + file_name + "] downloaded successfully.");
        });
	} else {
		console.log("Loading " + file_name + " from cache...");
	}

    return file_path;
}

function is_file_existed_on_memory(file_name) {
	let file_path = TEMP_DIRECTORY + file_name;

	if (fs.existsSync(file_path)) {
		return true;
	} else {
		return false;
	}
}

function download_if_file_exists_on_AWS_S3(file_name) {
	let file_path = TEMP_DIRECTORY + file_name;
	let s3 = new aws.S3();
    let params = {
    	Bucket: PROJECT_BUCKET,
    	Key: file_name
    }
    let file_read_stream;
    
    return false;
    
    try {
    	file_read_stream = s3.getObject(params).createReadStream();
    } catch(err) {
    	console.log(err);
    	return false;
    }
    
    file_read_stream.pipe(fs.createWriteStream(file_path));
    //return true;
}

function upload_to_bucket(file_path) {
	let s3 = new aws.S3();
	let file_name = get_file_name_from_string(file_path);
	let params = {
		Bucket: PROJECT_BUCKET,
		Key: file_name,
		Body: fs.createReadStream(file_path)
	}
	
	console.log("Uploading " + file_name + "...");
	s3.upload(params, function(err, data) {
		if (err) {
			console.log("Error in upload_to_bucket");
			console.log(err, err.stack);
		} else {
			//console.log(data);
		}
	});
	
	console.log("Finish uploading " + file_name);
}

function is_database_existed(connection, database_name) {
    let query = "show databases";
    connection.query(query, function(err, result) {
        if (err) {
            console.log(err);
        } else {
            console.log(result);
            for (let row of result) {
        	    // ["Tables_in_mysql"]
    	        if (row["Database"] == database_name) {
    		        return true;
    	        }
            }
        }       
    });

    return false;
}

function create_database(connection, database_name) {
    connection.query("create database " + database_name);
}

function is_table_existed(connection) {
	let file = fs.readFileSync("sqldb/check_table.sql", "utf8");
    return connection.query(file);
}

function drop_table(connection) {
	let file = fs.readFileSync("sqldb/drop_table.sql", "utf8");
	return connection.query(file);
}

function create_table(connection) {
    let file = fs.readFileSync("sqldb/create_table.sql", "utf8");
    return connection.query(file);
}

function get_insert_statement() {
    return fs.createReadStream("sqldb/insert_table.sql", "utf8");
}

// Insert a processed CSV file into database
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
    

function add_data_aggregations(fields) {
	let query_string = "select " +
		"avg(sr.order_processing_time) as avg_order_processing_time, " +
		"avg(sr.gross_margin) as avg_gross_margin, " +
		"avg(sr.unit_sold) as avg_unit_sold, " +
		"max(sr.unit_sold) as max_unit_sold, " +
		"min(sr.unit_sold) as min_unit_sold, " +
		"sum(sr.unit_sold) as total_unit_sold, " +
		"sum(sr.total_revenue) as total_total_revenue, " +
		"sum(sr.total_profit) as total_total_profit, " +
		"count(*) as total_orders " +
		"from sales_records sr ";

	let keys_list = [];
    for (let property in fields) {
        keys_list.push(property);
    }
    
    if (keys_list.length > 0) {
        query_string = query_string + "where sr." + keys_list[0] + "='" + fields[keys_list[0]] + "' ";
        for (let i=0; i<keys_list.length; i++) {
        	query_string = query_string + "and sr." + keys_list[i] + "='" + fields[keys_list[i]] + "' ";
        }
    }
    query_string = query_string + ";";
   
    return query_string;
}


module.exports = {
	// Definitions
	PROCESSED_NAME,
	TEMP_DIRECTORY,
	PROJECT_BUCKET,
	LOCATION_CONSTRAINT,
	TITLE,
	
	// Transformations
	orderProcessingTime,
	orderPriority,
	grossMargin,
	isDupOrderID,
	generate_new_csv_file,
	
	// Preparations
	config,
	get_file_name_from_string,
	download_file,
	is_file_existed_on_memory,
	download_if_file_exists_on_AWS_S3,
	upload_to_bucket,
	is_database_existed,
	create_database,
	is_table_existed,
	drop_table,
	create_table,
	get_insert_statement,
	insert_CSV_into_database,
	
	add_data_aggregations,
	add_full_data_set

}
