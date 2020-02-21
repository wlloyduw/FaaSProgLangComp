'''
Created on Nov 24, 2019

@author: varikmp
'''
from handler import yourFunction
import os

my_request = dict()
  
# http://faculty.washington.edu/wlloyd/courses/tcss562/project/etl/sales_data/

my_request["bucketname"] = "project.bucket.tcss562.vmp"
my_request['key'] = "100_newdata.csv" # "100_Sales_Records.csv"
my_request["batchSize"] = 10000
my_request['tablename'] = "mytable_1000"
my_request["stressTestLoops"] = 1000

os.environ["databaseEndpoint"] = "localhost"
os.environ["databaseName"] = "562Group2DB"
os.environ["username"] = "varikmp"
os.environ["password"] = "password"

# os.environ["databaseEndpoint"] = "admin.cluster-cfcyka432suz.us-east-1.rds.amazonaws.com"
# os.environ["databaseName"] = "562Group2DB"
# os.environ["username"] = "admin"
# os.environ["password"] = "password"

# print(extract(my_request, True))
print(yourFunction(my_request, True))
# print(query(my_request, True))

# from utilities import is_bucket_existed, list_all_buckets
# print(list_all_buckets())
# print(is_bucket_existed('tcss562.mylogs.vmp'))

# from utilities import upload_to_bucket
# upload_to_bucket('/tmp/100_sales_records.csv')


# from utilities import download_if_file_exists_on_amazon_s3
# download_if_file_exists_on_amazon_s3('processed_100_sales_records.csv')

