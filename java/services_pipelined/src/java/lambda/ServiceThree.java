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
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.s3.model.Region;
import com.amazonaws.services.s3.model.*;
import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONString;
import java.io.*;
/*
import java.io.FileReader;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.StringWriter;
import java.io.InputStreamReader;
import java.io.InputStream;
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
 * @author david perez
 */
public class ServiceThree implements RequestHandler<Request, HashMap<String, Object>>
{
    static String CONTAINER_ID = "/tmp/container-id";
    static Charset CHARSET = Charset.forName("US-ASCII");
    static String[] FILTER_BY_VALUES= {"Region", "Item_Type", "Sales_Channel", "Order_Priority", "Country"};
    static String[] AGGREGATE_BY_VALUES= {"max", "min", "avg", "sum"};
    public JSONArray filterByArr(JSONObject Arr, String Key) {
            return Arr.getJSONArray(Key);
    }
    /**
    *This method will create a list of strings that contain query information regarding to Where to query at.
    *For example, a created string could be "WHERE Region = ".
    * This string is basically the beginning half of a query. The other half is made using another method where we create the Select portion of the query.
    *@param JSONObj is a JSONObject with information holding lists of where to query from and what to query.
    */
    public LinkedList<String> createWhereString(JSONObject JSONObj) {
            LinkedList<String> newList = new LinkedList<String>();
            for (int i = 0; i < FILTER_BY_VALUES.length; i++) {
                    JSONArray arrJson=JSONObj.getJSONArray(FILTER_BY_VALUES[i]);
                    for(int j=0;j<arrJson.length();j++) {
                            String whereString="WHERE ";
                            String filterVal = "`" +FILTER_BY_VALUES[i].replace('_', ' ') +"`"; 
                            whereString += filterVal +"=\"" +arrJson.getString(j).replace('_', ' ') +"\"" ;
                            newList.add(whereString);
                    }
            }
            return newList;
    }
    /**
    *This method will create a list of strings that contain query information regarding to what to Select from the tables.
    *For example, a created string could be "SELECT MAX (`Units Sold`), AS `Filtered By` FROM {mytable}";.
    * This string is basically the end half of a query. The other half is made using another method where we create the Where portion of the query.
    */
    public LinkedList<String> createAggFunctionStrings(JSONObject JSONObj, String mytable, LinkedList<String> filterBy) {
            LinkedList<String> newList = new LinkedList<String>();
            for (int q = 0; q < filterBy.size(); q++ ) {
                String filterByString = filterBy.get(q);
                String aggString="SELECT ";
                for (int i =0; i < AGGREGATE_BY_VALUES.length; i++) {
                        JSONArray arrJson=JSONObj.getJSONArray(AGGREGATE_BY_VALUES[i]);
                        for(int j=0;j<arrJson.length();j++) {
                                aggString+= AGGREGATE_BY_VALUES[i].toUpperCase() + "(`";
                                aggString+=arrJson.getString(j).replace('_', ' ') +"`)";				
                                aggString+=", ";
                        }	
                }
                aggString+=" \"" + filterByString.replace('"', ' ')  + "\" ";
                aggString+="AS `Filtered By` ";
                aggString+="FROM " + mytable + " ";
                aggString+=filterByString +";";
                newList.add(aggString);
            }
            return newList;
    }
   
    /**
    *This method will convert a list of queries into a single query containing all queries unioned.
    * @param queries is a list of queries that will be unioned together into a single string.
    */
    public String Union_Queries(LinkedList<String> queries) {
        String fullQuery = "";
        for (int i = 0; i < queries.size(); i++) {
            fullQuery += queries.get(i).replace(';', ' ');
            if ( i != queries.size() -1) {
                fullQuery += " UNION ";
            }
        }
        fullQuery +=";";
        return fullQuery;
    }

    /**
    * This method will convert a resultset into a JSON string.
    * @param rs is a ResultSet that will be converted to a json string.
    */
    public String convertRsToJSON(ResultSet rs) {
        JSONArray json = new JSONArray();
        try { 
            ResultSetMetaData rsmd = rs.getMetaData();
            while(rs.next()) {
              int numColumns = rsmd.getColumnCount();
              JSONObject obj = new JSONObject();
              for (int i=1; i<=numColumns; i++) {
                String column_name = rsmd.getColumnName(i);
                obj.put(column_name, rs.getObject(column_name));
              }
              json.put(obj);
            }
        } catch (SQLException e) {
            System.out.println("Sql exception while converting ResultSet to String");
        }
        return json.toString();
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
        String bucketname = request.getBucketName();
        String key = request.getKey();
        Response r = new Response();
        String mytable = request.getTableName();
        JSONObject filterByJSON = request.getFilterByAsJSONOBJ(); 
        JSONObject aggregateByJSON = request.getAggregateByAsJSONOBJ();
        LinkedList<String> whereStrings= createWhereString(filterByJSON);
        LinkedList<String> queryStrings = createAggFunctionStrings(aggregateByJSON, mytable, whereStrings);
        String fullQuery = Union_Queries(queryStrings);	
        logger.log(filterByJSON.toString());
        logger.log(aggregateByJSON.toString());

        for (int i = 0; i < queryStrings.size(); i++) {
            logger.log(queryStrings.get(i).toString());
        }
        logger.log(fullQuery);
        try 
        { 
            Properties properties = new Properties();
            properties.load(new FileInputStream("db.properties")); 
            String url = properties.getProperty("url");
            String username = properties.getProperty("username");
            String password = properties.getProperty("password");
            String driver = properties.getProperty("driver");
            Connection con = DriverManager.getConnection(url,username,password);
            PreparedStatement ps = con.prepareStatement(fullQuery);
            ResultSet rs = ps.executeQuery();
            String queryResults = convertRsToJSON(rs);
            AmazonS3 s3Client = AmazonS3ClientBuilder.standard().build();  
            s3Client.putObject(bucketname, "QueryResults.txt", queryResults);
            int iteration = 100;
            for (int i = 0; i < iteration; i++) {
                String testQuery = "SELECT * from " + mytable + ";";
                ps =  con.prepareStatement(fullQuery);
                ps.executeQuery();
            }
	    con.close();
        }
        catch (Exception e) 
        {
            logger.log("Got an exception working with MySQL! ");
            logger.log(e.getMessage());
        }
        // Set return result in Response class, class is marshalled into JSON
        r.setValue("Finished with querying database");
        //****************END FUNCTION IMPLEMENTATION***************************
        inspector.consumeResponse(r);
        //Collect final information such as total runtime and cpu deltas.
        inspector.inspectAllDeltas();
        return inspector.finish();
    }
}
