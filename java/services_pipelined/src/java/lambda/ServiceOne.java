package lambda;

import saaf.Inspector;
import saaf.Response;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.s3.model.ObjectMetadata;
//import java.nio.charset.StandardCharsets;
import com.amazonawasdkjsafdfjdskfjdskfjs.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import java.sql.Timestamp;
import java.io.*;
/*
import java.io.StringWriter;
import java.io.InputStream;
import java.io.FileReader;
import java.util.Arrays;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
*/
import java.util.*;
/*
import java.util.Date;
import java.util.HashMap;
import java.util.Random;
*/



/**
 * uwt.lambda_test::handleRequest
 *
 * @author Wes Lloyd
 * @author Robert Cordingly
 * @author David Perez
 */
public class ServiceOne implements RequestHandler<Request, HashMap<String, Object>> {

    public static String TEMP_DIRECTORY = "/tmp/";
    public static String PROCESSED_NAME = "processed_";

    /**
    *This method will take information from an InputStream and will read it into a list of String[], where each element in the String[] is an attribute within a column.
    *@Param input is an InputStream holding information from a CSV file.
    */
    public List<String[]> readcsv(InputStream input, String key) {
        int len = 0;
        List<String[]> records = new ArrayList<String[]>();

        try {
            byte[] data = null;

            FileOutputStream fileOutputStream = new FileOutputStream(TEMP_DIRECTORY +PROCESSED_NAME + key);
            while ((len = input.read(data)) != -1) {
                    fileOutputStream.write(data, 0, len);
            }
        } catch (Exception e) {
            System.out.println("Download error");
        }
       
        try {
            File csv_file = new File(TEMP_DIRECTORY + PROCESSED_NAME + key);
            BufferedReader file_reader = new BufferedReader(new FileReader(csv_file));
            String line;
	    file_reader.readLine();
			
            // Insert data row by row
            while ((line = file_reader.readLine()) != null){
            	String[] fields = line.split(",");
            	records.add(fields);
            }
            file_reader.close();
        } catch (Exception e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
        }
        return records;
    }

    /**
    * This method will take a CSVReader holding information from a CSVFILE and return a StringBuilder of the csv file with modified information.
    * @Param Reader is a CSVReader used to process information from a csv file.
    * @Param logger is a LambdaLogger to log information to cloudwatch.
    */
    public StringBuilder writecsv(List<String[]> records, LambdaLogger logger) {

	StringBuilder sb = new StringBuilder();
        try {
            for (int i = 0; i < records.size(); i ++) {
                Set<Integer> unique_ids = new HashSet<Integer>();        
                if (i == 0) {
                    sb.append(String.join(",", records.get(i)) +",Order Processing Time, Gross Margin\n");

                } else {
                    //loaded_entries = new ArrayList(Arrays.asList(entries));
                    if (unique_ids.contains(Integer.parseInt(records.get(i)[6]))) {
                        continue;
                    } else {

                        String val = records.get(i)[4];
                        if (val.equals("C")) {

                        }
                        else if (val.equals("L")){
                            records.get(i)[4]="Low";
                        }
                        else if (val.equals("M")){
                            records.get(i)[4]="Medium";
                        }
                        else if (val.equals("H")) {
                            records.get(i)[4]="High";
                        }


                        String[] date1_values=(records.get(i)[5]).split("/");
                        String[] date2_values=(records.get(i)[7]).split("/");
                        int month = Integer.parseInt(date1_values[0]);
                        int day = Integer.parseInt(date1_values[1]);
                        int year = Integer.parseInt(date1_values[2]);

                        int month2 = Integer.parseInt(date2_values[0]);
                        int day2 = Integer.parseInt(date2_values[1]);
                        int year2 = Integer.parseInt(date2_values[2]);

                        int order_time= ((year2 - year) * 365) + ((month2 - month) * 30) + (day2 - day);
                        float gross_margin = Float.parseFloat((records.get(i)[13])) / Float.parseFloat((records.get(i)[11])); 
                        records.get(i)[14]=(Integer.toString(order_time));
                        records.get(i)[15]=(String.valueOf(gross_margin));

                        sb.append(String.join(",", records.get(i)) +"\n");
                        unique_ids.add(Integer.parseInt(records.get(i)[6]));
                    }
                }
            }
        } catch (Exception e) {
             throw new RuntimeException("Can't parse file " +  e);
        }
	return sb;
    }



    /**
     * Lambda Function Handler
     * 
     * @param request Request POJO with defined variables from Request.java
     * @param context 
     * @return HashMap that Lambda will automatically convert into JSON.
     */
    public HashMap<String, Object> handleRequest(Request request, Context context) {
       
        //Collect inital data.
        Inspector inspector = new Inspector();
        inspector.inspectAll();
        LambdaLogger logger = context.getLogger();
        
        //****************START FUNCTION IMPLEMENTATION*************************
        //Add custom key/value attribute to SAAF's output. (OPTIONAL)
        inspector.addAttribute("message", "bucketname is = " + request.getBucketName()
                + "! This is an attributed added to the Inspector!");

        String bucketname = request.getBucketName();
        String key = request.getKey();        

        AmazonS3 s3Client = AmazonS3ClientBuilder.standard().build();         
        //get object file using source bucket and srcKey name
        S3Object s3Object = s3Client.getObject(new GetObjectRequest(bucketname, key));
        //get content of the file

        InputStream objectData = s3Object.getObjectContent();
        //scanning data line by line
        logger.log("reading csv into records start");
        
        List<String[]> records = readcsv(objectData, TEMP_DIRECTORY + key);
        StringBuilder sw = writecsv(records, logger);
        logger.log("finished reading records");
        logger.log("finished writing records");        

       // byte[] bytes = sw.toString().getBytes(StandardCharsets.UTF_8);
        byte[] bytes = sw.toString().getBytes();
        InputStream is = new ByteArrayInputStream(bytes);
        ObjectMetadata meta = new ObjectMetadata();
        meta.setContentLength(bytes.length);
        meta.setContentType("text/plain");
	
        AmazonS3 s3Client2 = AmazonS3ClientBuilder.standard().build();
	logger.log(key.substring(0, key.lastIndexOf('.')) +"_"+  System.currentTimeMillis() +"_" + inspector.getAttribute("uuid") + ".csv");
        s3Client2.putObject(bucketname, key.substring(0, key.lastIndexOf('.')) +"/"+  System.currentTimeMillis() +"_" + inspector.getAttribute("uuid") + ".csv", is, meta);
        Response response = new Response();

        response.setValue("Bucket: " + bucketname + " key:" + key + " processed. record 0 = ");

        inspector.consumeResponse(response);
        
        //****************END FUNCTION IMPLEMENTATION***************************
        //Collect final information such as total runtime and cpu deltas.
        inspector.inspectAllDeltas();
        return inspector.finish();
    }
}
