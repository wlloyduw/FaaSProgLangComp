/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package lambda;


import saaf.Inspector;
import saaf.Response;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.amazonaws.services.s3.model.ObjectMetadata;


import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.Map;
import java.util.Map.Entry;

import java.io.*;

import java.util.*;

/**
 * uwt.lambda_test::handleRequest
 * @author wlloyd
 * @author david perez
 */
public class ServiceThree implements RequestHandler<Request, HashMap<String, Object>> {

	
	
	    
    public int hashSize(HashMap<String, String[]> theHashMap) {
            int count = 0;
            Iterator<Entry<String, String[]>> it = theHashMap.entrySet().iterator();

            for(Entry<String, String[]> e : theHashMap.entrySet()) {
                count += e.getValue().length;
            }
            return count;
    }

    /**
    *This method will create a list of strings that contain query information regarding to Where to query at.
    *For example, a created string could be "WHERE Region = ".
    * This string is basically the beginning half of a query. The other half is made using another method where we create the Select portion of the query.
    *@param JSONObj is a JSONObject with information holding lists of where to query from and what to query.
    */
    public String[] createWhereString(HashMap<String, String[]> filter_values, int size) {

        String[] filterBy = new String[size];
        int index =0;

        //Iterator<Entry<String, String[]>> it = filter_values.entrySet().iterator();

        for(Entry<String, String[]> e : filter_values.entrySet()) {

            String key = e.getKey();
            String[] filterArray = e.getValue();
            for (String value : filterArray) {
                String whereString="WHERE ";
                String filterVal = "`" + key +"`";;
                whereString += filterVal +"=\"" + value + "\"";
                filterBy[index] = whereString;
                index++;
            }
        }
        return filterBy;

    }

    
    
    public String[] createAggFunctionStrings(HashMap<String, String[]> aggregateValues, String mytable, String[] filterBy, int size) {
        String[] aggregateBy = new String[size];
        int index = 0;

        for (int i = 0; i < filterBy.length; i++) {
            String filterByString = filterBy[i];
            String aggString="SELECT ";


            for(Entry<String, String[]> e : aggregateValues.entrySet()) {

                String key = e.getKey();
                String[] aggregateArray = e.getValue();
                for (String value : aggregateArray) {
                    aggString += key + "(`";
                    aggString += value + "`), ";
                }

            }
            aggString+=" \"" + filterByString.replace('"', ' ')  + "\" ";
            aggString+="AS `Filtered By` ";
            aggString+="FROM " + mytable + " ";
            aggString+=filterByString;
            aggregateBy[index] = aggString;
            index++;	            		
        }
               
        return aggregateBy;
    }

    
 
   /**
    *This method will convert a list of queries into a single query containing all queries unioned.
    * @param queries is a list of queries that will be unioned together into a single string.
    */
    public String Union_Queries(String[] queries) {
        String fullQuery = "";
        for (int i = 0; i < queries.length; i++) {
            fullQuery += queries[i];
            if ( i != queries.length -1) {
                fullQuery += " UNION ";
            }
        }
        fullQuery +=";";
        return fullQuery;
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


        HashMap<String, String[]> filterByMap = new HashMap<String, String[]>();
	filterByMap.put("Region", new String[]{"Australia and Oceania"});
	filterByMap.put("Item Type", new String[]{"Office Supplies"});
	filterByMap.put("Sales Channel", new String[]{"Office Supplies"});
	filterByMap.put("Order Priority", new String[]{"Offline"});
	filterByMap.put("Country", new String[]{"Fiji"});

	HashMap<String, String[]> aggregateByMap = new HashMap<String, String[]>();
	aggregateByMap.put("max", new String[]{"Units Sold"});
	aggregateByMap.put("min", new String[]{"Units Sold"});
	aggregateByMap.put("avg", new String[]{"Order Processing Time", "Gross Margin", "Units Sold"});
	aggregateByMap.put("sum", new String[]{"Units Sold", "Total Revenue", "Total Profit"});


        //****************START FUNCTION IMPLEMENTATION*************************
        //Create and populate a separate response object for function output. (OPTIONAL)
        String bucketname = request.getBucketName();
        String key = request.getKey();
        Response r = new Response();
        String mytable = request.getTableName();
        String myTable = request.getTableName();
        int size = hashSize(filterByMap);
	String[] whereStrings = createWhereString(filterByMap, size);
	String[] queryStrings = createAggFunctionStrings(aggregateByMap, myTable, whereStrings, size);

        for (int i = 0; i < whereStrings.length; i++) {
            logger.log("where string: " + whereStrings[i]);
        }
        for (int i = 0; i < queryStrings.length; i++) {
            logger.log("full query string" + queryStrings[i]);
        }
        String fullQuery = Union_Queries(queryStrings);	

        logger.log(fullQuery);
        try 
        { 
            Properties properties = new Properties();
            properties.load(new FileInputStream("db.properties")); 
            //String url = properties.getProperty("url");
            String username = System.getenv("username");   //
            String password = System.getenv("password"); 	 //properties.getProperty("password");
	    //String databaseName = System.getenv("databaseName");
	    String url = System.getenv("url");

            String driver = properties.getProperty("driver");

		


            Connection con = DriverManager.getConnection(url,username,password);
            PreparedStatement ps = con.prepareStatement(fullQuery);
            ResultSet rs = ps.executeQuery();
            StringBuilder queryResults = convertRStoCSV(rs);
            byte[] bytes = queryResults.toString().getBytes();
            InputStream is = new ByteArrayInputStream(bytes);
            ObjectMetadata meta = new ObjectMetadata();
            meta.setContentLength(bytes.length);
            meta.setContentType("text/plain");

            AmazonS3 s3Client = AmazonS3ClientBuilder.standard().build();  
            s3Client.putObject(bucketname, "QueryResults.csv", is, meta);
	    stressTest(10, mytable);
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

   


    private StringBuilder convertRStoCSV(ResultSet rs) throws  Exception{
        StringBuilder sb = new StringBuilder();
        try {
        //List<String> resultSetAsList;
            int numCols = rs.getMetaData().getColumnCount();
            while(rs.next()) {
                for (int i = 1; i <= numCols -1; i++) {
                    sb.append(String.format(String.valueOf(rs.getString(i))) + ", ");

                }
                sb.append(String.format(String.valueOf(rs.getString(numCols))) + "\n");
            }

        } catch (SQLException e) {

        }
        return sb;

    }

    public static void stressTest( int iterations, String mytable) {
        try {
        Connection con = DriverManager.getConnection(System.getenv("url"),System.getenv("username"),System.getenv("password"));

            for (int i = 0; i < iterations; i++) {
                String testQuery = "SELECT * from " + mytable + ";";
                PreparedStatement ps =  con.prepareStatement(testQuery);
                ResultSet rs = ps.executeQuery();
                //rs.next() iterates over the rows of the table
                //the for loop within the rs.next() iterates for the items within the row.
                //16 is the hardcoded number of elements that will be in each row. This 16 can be replaced if there is a method to determine # of items
                //in a row within a resultset.
                while (rs.next()) {
                    for (int j = 0; j < 16; j++) {
                        rs.getString(j);
                    }
                }
            }
        con.close();
        } catch (SQLException e) {

        } 
    }
}