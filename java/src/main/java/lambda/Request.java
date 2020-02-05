/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package lambda;
import java.util.HashMap;

/**
 * @author David
 * @author wlloyd
 */
public class Request {
    HashMap<String, String[]> filterBy;
    HashMap<String, String[]> aggregateBy;
    int batchsize;
    String bucketname;
    String key;
    String tablename;

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

    public int getBatchSize() {
        return this.batchsize;
    }
	
    public void setBatchsize(int theBatchsize) {
        this.batchsize = theBatchsize;
    }
    

	public HashMap<String, String[]> getFilterBy() {
		return this.filterBy;
	}

	public HashMap<String, String[]> getAggregateBy() {
		return this.aggregateBy;
	}

	public void setFilterBy(HashMap<String, String[]> theFilterBy) {
		this.filterBy = theFilterBy;
	}

	public void setAggregateBy(HashMap<String, String[]> theAggregateBy) {
		this.aggregateBy = theAggregateBy;
	}


	//constructor
    public Request(HashMap<String, String[]> filterBy, HashMap<String, String[]> aggregateBy, String key, String bucketname, String tablename, int batchsize) {
        this.setFilterBy(filterBy);
        this.setAggregateBy(aggregateBy);
        this.setBucketname(bucketname);
        this.setKey(key);
		this.setTablename(tablename);
    	this.setBatchsize(batchsize);
    }


    public Request() {

    }
}
