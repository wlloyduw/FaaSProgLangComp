
/**
 * Define your FaaS Function here.
 * Each platform handler will call and pass parameters to this function.
 *
 * @param request A JSON object provided by the platform handler.
 * @param context A platform specific object used to communicate with the platform.
 * @returns A JSON object to use as a response.
 */

//
// Service 1: extract and transform
//

module.exports = function(request, context) {
        
    const inspector = new (require('./Inspector'))();
    inspector.inspectAll();

    inspector.addAttribute("message", "extracting...");

    var url = request["csv_url_file"];
    var file_name = get_file_name_from_string(url);

    // Read CSV input file
    console.log("Prepare to process the file data");
    var file_path = download_file(url);
    var processed_file_path = generate_new_csv_file(file_path, file_name);

    upload_to_bucket(processed_file_path);
    
    inspector.inspectAllDeltas();
    return inspector.finish();
};

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