/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package lambda;


/**
 * @author David
 * @author wlloyd
 */
public class Request {
    HashMap<String, String[]> filterBy;
    HashMap<String, String[]> aggregateBy;
    int batchSize;
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
        return this.batchSize;
    }
	
    public void setBatchSize(int batchSize) {
        this.batchSize = batchSize;
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
    public Request(HashMap<String, String[]> filterBy, HashMap<String, String[]> aggregateBy, String key, String bucketname, String tablename, int batchSize) {
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
