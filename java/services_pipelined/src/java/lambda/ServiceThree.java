/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package lambda;


import saaf.Inspector;
import saaf.Reponse;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3;

import com.amazonaws.services.lambda.runtime.LambdaLogger;


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
            while (it.hasNext()) {
                    Map.Entry<String, String[]> pair = (Map.Entry<String, String[]>) it.next();
                    count += pair.getValue().length;
            }
            return count;
    }

    /**
    *This method will create a list of strings that contain query information regarding to Where to query at.
    *For example, a created string could be "WHERE Region = ".
    * This string is basically the beginning half of a query. The other half is made using another method where we create the Select portion of the query.
    *@param JSONObj is a JSONObject with information holding lists of where to query from and what to query.
    */
    public String[] createWhereString(HashMap<String, String[]> filter_values) {

		String[] filterBy = new String[hashSize(filter_values)];
		int index =0;
                
                Iterator<Entry<String, String[]>> it = filter_values.entrySet().iterator();
                while (it.hasNext()) {
			Map.Entry<String, String[]> pair = (Map.Entry<String, String[]>) it.next();
                        for (String value : pair.getValue()) {
                            String whereString="WHERE ";
                            String filterVal = "`" + pair.getKey();
                            whereString += filterVal +"=\"" + value.replace('_', ' ') + "`";
                            filterBy[index] = whereString;
                            index++;
                        }
                }
                
		return filterBy;
    }
    
    public String[] createAggFunctionStrings(HashMap<String, String[]> aggregateValues, String mytable, String[] filterBy) {
        String[] aggregateBy = new String[hashSize(aggregateValues)];
        int index = 0;


        for (int i = 0; i < filterBy.length; i++) {
            String filterByString = filterBy[i];
            String aggString="SELECT ";

            Iterator<Entry<String, String[]>> it = aggregateValues.entrySet().iterator();
            while (it.hasNext()) {
                    Map.Entry<String, String[]> pair = (Map.Entry<String, String[]>) it.next();
                    for (String value : pair.getValue()) {
                        aggString += pair.getKey() + "(`";
                        aggString += value.replace('_', ' ') + "`)";
                        aggString +=", ";
                    }
            }
            aggString+=" \"" + filterByString.replace('"', ' ')  + "\" ";
            aggString+="AS `Filtered By` ";
            aggString+="FROM " + mytable + " ";
            aggString+=filterByString +";";
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
            fullQuery += queries[i].replace(';', ' ');
            if ( i != queries.length -1) {
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
        //JSONArray json = new JSONArray();
        try { 
            ResultSetMetaData rsmd = rs.getMetaData();
            while(rs.next()) {
              int numColumns = rsmd.getColumnCount();
          //    JSONObject obj = new JSONObject();
              for (int i=1; i<=numColumns; i++) {
                String column_name = rsmd.getColumnName(i);
                //obj.put(column_name, rs.getObject(column_name));
              }
            //  json.put(obj);
            }
        } catch (SQLException e) {
            System.out.println("Sql exception while converting ResultSet to String");
        }
        //return json.toString();
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
	logger.log("test");
        //****************START FUNCTION IMPLEMENTATION*************************
        //Create and populate a separate response object for function output. (OPTIONAL)
        String bucketname = request.getBucketName();
	logger.log("test");
        String key = request.getKey();
	logger.log("test");
        Response r = new Response();
	logger.log("test");
        String mytable = request.getTableName();
	HashMap<String, String[]> filterByMap = request.geFilterBy();
	HashMap<String, String[]> aggregateByMap = request.getAggregateBy();	
	logger.log("test");
	String[] whereStrings = createWhereString(filterByMap);
	String[] queryStrings = createAggFunctionStrings(aggregateByMap, myTable, whereStrings);
        String fullQuery = Union_Queries(queryStrings);	

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
           // String queryResults = convertRsToJSON(rs);
            AmazonS3 s3Client = AmazonS3ClientBuilder.standard().build();  
           // s3Client.putObject(bucketname, "QueryResults.txt", queryResults);
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
