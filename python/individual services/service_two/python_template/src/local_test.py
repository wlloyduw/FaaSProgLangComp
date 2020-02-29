'''
Created on Nov 24, 2019

@author: varikmp
'''
from handler import yourFunction
import os

my_request = dict()
  
# http://faculty.washington.edu/wlloyd/courses/tcss562/project/etl/sales_data/

my_request["bucketname"] = "project.bucket.tcss562.vmp"
my_request['key'] = "edited_100_Sales_Records.csv" # "100_Sales_Records.csv"
my_request["batchSize"] = 10000
my_request['tablename'] = "mytable_100"
my_request["stressTestLoops"] = 1

# my_request["dbEndPoint"] = "localhost"
# my_request["dbName"] = "562Group2DB"

os.environ["databaseEndpoint"] = "admin.cluster-cfcyka432suz.us-east-1.rds.amazonaws.com"
os.environ["databaseName"] = "562Group2DB"
os.environ["username"] = "varikmp"
os.environ["password"] = "password"

print(yourFunction(my_request, True))