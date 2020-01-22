/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package lambda;

import saaf.Inspector;
import saaf.Response;
import com.amazonaws.services.lambda.runtime.ClientContext;
import com.amazonaws.services.lambda.runtime.CognitoIdentity;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.Region;
import com.amazonaws.services.s3.model.*;
import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.io.FileReader;
import java.io.*;
/*
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.StringWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
*/
import java.util.*;
/*
import java.util.Arrays;
import java.util.HashMap;
import java.util.Random;
import java.util.LinkedList;
import java.util.Properties;
*/

/**
 * uwt.lambda_test::handleRequest
 * @author wlloyd
 * @author David Perez
 */
public class ServiceTwoSQL implements RequestHandler<Request, HashMap<String, Object>>
{
    static String CONTAINER_ID = "/tmp/container-id";
    static Charset CHARSET = Charset.forName("US-ASCII");
    /**
    *This method will take information from an InputStream and will read it into a list of String[], where each element in the String[] is an attribute within a column.
    *@Param input is an InputStream holding information from a CSV file.
    */
    public List<String[]> readcsv(InputStream input) {
        List<String[]> records = new ArrayList<String[]>();
        CSVReader csvReader = null;
        try {
            csvReader = new CSVReader(new InputStreamReader(input));
            csvReader.readNext();
            records = csvReader.readAll();
        } catch (Exception e) {
            System.out.println("error");
        }
        return records;
    }

    /**
    *This method will take a list of Records from a CSV file and will write the information into a database.
    * @Param Records is a list of String[] where each String[] holds information to be added to a database.
    * @Param url is a url to be used to connect to a database.
    * @Param username is the username attached to the database
    * @Param password is the password needed to connect to the database
    * @Param mytable is the table in the database where rows of information will be created
    * @Param logger is a LambdaLogger to log information to cloudwatch.
    */
    public void write_csv(List<String[]> Records, String url,String username,String password, String mytable, int batchSize, LambdaLogger logger) {
        try 
        { 
            logger.log("checkcon: " + url + ", " +username +", " + password  );
            Connection con = DriverManager.getConnection(url,username,password);
            logger.log("checkcon2");
            PreparedStatement ps = con.prepareStatement("DROP TABLE IF EXISTS `" + mytable + "`;");
            ps.execute();
            ps = con.prepareStatement("CREATE TABLE "+ mytable + " (Region VARCHAR(40), Country VARCHAR(40), `Item Type` VARCHAR(40), `Sales Channel` VARCHAR(40),`Order Priority` VARCHAR(40), `Order Date` VARCHAR(40),`Order ID` INT PRIMARY KEY, `Ship Date` VARCHAR(40), `Units Sold` INT,`Unit Price` DOUBLE, `Unit Cost` DOUBLE, `Total Revenue` DOUBLE, `Total Cost` DOUBLE, `Total Profit` DOUBLE, `Order Processing Time` INT, `Gross Margin` FLOAT) ENGINE = MyISAM;");
            ps.execute();
	    logger.log("before insertion");
            String mySql = "insert into "+ mytable +" (Region, Country, `Item Type`, `Sales Channel`, `Order Priority`, `Order Date`, `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Order Processing Time`, `Gross Margin`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,? ,? ,?)";
            PreparedStatement statement = con.prepareStatement(mySql);
            try {
                int i = 0;
                for (String[] record: Records) {
                    statement.setString(1, record[0]);
                    statement.setString(2, record[1]);
                    statement.setString(3, record[2]);
                    statement.setString(4, record[3]);
                    statement.setString(5, record[4]);
                    statement.setString(6, record[5]);
                    statement.setString(7, record[6]);
                    statement.setString(8, record[7]);
                    statement.setString(9, record[8]);
                    statement.setString(10, record[9]);
                    statement.setString(11, record[10]);
                    statement.setString(12, record[11]);
                    statement.setString(13, record[12]);
                    statement.setString(14, record[13]);
                    statement.setString(15, record[14]);
                    statement.setString(16, record[15]);
                    statement.addBatch();
                    if (++i % batchSize == 0) {
                        logger.log("finished: " + i);
                        statement.executeBatch();
                    }
                }
                statement.executeBatch();
                statement.close();
                con.close();
            } catch (Exception e) {
                logger.log("Exection using csvreader: " + e);
            }
        }
        catch (Exception e) 
        {
            logger.log("Got an exception working with MySQL! ");
            logger.log(e.getMessage());
        }
    }
       
    /**
     * Lambda Function Handler
     * 
     * @param request Request POJO with defined variables from Request.java
     * @param context 
     * @return HashMap that Lambda will automatically convert into JSON.
     */
    public HashMap<String, Object> handleRequest(Request request, Context context) {
        // Create logger
        LambdaLogger logger = context.getLogger();
        //Collect inital data.
        Inspector inspector = new Inspector();
        inspector.inspectAll();
        inspector.addTimeStamp("frameworkRuntime");
        //****************START FUNCTION IMPLEMENTATION*************************
        //Create and populate a separate response object for function output. (OPTIONAL)
        Response r = new Response();
        String bucketname = request.getBucketName();
        String key = request.getKey();
	String mytable=request.getTableName();
	int batchSize = request.getBatchSize();
	logger.log(mytable);
        logger.log(bucketname);
        logger.log(key);
        AmazonS3Client s3 = new AmazonS3Client();
        s3.setEndpoint("s3.amazonaws.com");
        S3Object obj = s3.getObject(new GetObjectRequest(bucketname, key));
        logger.log(obj.getBucketName());
        InputStream objectData = obj.getObjectContent();
        try 
        {
            Properties properties = new Properties();
            properties.load(new FileInputStream("db.properties"));
            String url = properties.getProperty("url");
            String username = properties.getProperty("username");
            String password = properties.getProperty("password");
            String driver = properties.getProperty("driver");
            List<String[]> records = readcsv(objectData);
            write_csv(records, url, username, password, mytable, batchSize, logger);
         
        } 
        catch (Exception e) 
        {
            logger.log("Got an exception working with MySQL! ");
            logger.log(e.getMessage());
        }
        //Print log information to the Lambda log as needed
        // Set return result in Response class, class is marshalled into JSON
        r.setValue("Finished with reading csv into database");
        //****************END FUNCTION IMPLEMENTATION***************************
        inspector.consumeResponse(r);
        //Collect final information such as total runtime and cpu deltas.
        inspector.inspectAllDeltas();
        return inspector.finish();
    }  
}
