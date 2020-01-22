/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package lambda;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONString;

/**
 *
 * @author wlloyd
 */
public class Request {
    String filterBy;
    String aggregateBy;
    JSONObject filterByJSON;
    JSONObject aggregateByJSON;
    String bucketname;
    String key;
    String tablename;
    int batchSize;
    public String getBucketName() {
        return this.bucketname;
    }
    
    public String getBucketNameALLCAPS() {
        return bucketname.toUpperCase();
    }

    public void setBucketname(String theBucketname) {
        this.bucketname = theBucketname;
    }

	 public String getTableName() {
        return this.tablename;
    }
    
    public String getTableNameALLCAPS() {
        return tablename.toUpperCase();
    }

    public void setTablename(String theTableName) {
        this.tablename = theTableName;
    }



    public String getKey() {
        return this.key;
    }
    
    public String getKeyALLCAPS() {
        return this.key.toUpperCase();
    }

    public void setKey(String theKey) {
        this.key = theKey;
    }

    public String getFilterBy() {
        return this.filterBy;
    }
    
    public String getFilterByALLCAPS() {
        return filterBy.toUpperCase();
    }

    public void setFilterBy(String filterBy) {
		//this.filterByJSON= filterBy;//new JSONObject(filterBy);
        //this.filterBy = filterBy.toString();
		this.filterBy = filterBy;  
		this.filterByJSON = new JSONObject(filterBy);
	}

    public JSONObject getFilterByAsJSONOBJ() {
            return this.filterByJSON;
    }


    public String getAggregateBy() {
        return this.aggregateBy;
    }
    
    public String getAggregateByALLCAPS() {
        return filterBy.toUpperCase();
    }

    public void setAggregateBy(String aggregateBy) {
        //this.aggregateBy = aggregateBy.toString();
		//this.aggregateByJSON = aggregateBy;
		this.aggregateBy = aggregateBy;    
		this.aggregateByJSON = new JSONObject(aggregateBy);
    }

    public JSONObject getAggregateByAsJSONOBJ() {
        return this.aggregateByJSON; 
    }
	
	
    public int getBatchSizee() {
        return this.batchSize;
    }
	
    public void setBatchSizee(int batchSize) {
        this.batchSize = batchSize;
    }
	
	//constructor
    public Request(String filterBy, String aggregateBy, String key, String bucketname, String tablename, int batchSize) {
        this.setFilterBy(filterBy);
        this.setAggregateBy(aggregateBy);
        this.setBucketname(bucketname);
        this.setKey(key);
	this.setTablename(tablename);
    	this.setBatchSize(batchSize);
    }


    public Request() {

    }
}
