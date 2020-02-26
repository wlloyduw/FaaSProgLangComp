'''
Created on Nov 24, 2019

@author: varikmp
'''
from handler import yourFunction

my_request = dict()
  
# http://faculty.washington.edu/wlloyd/courses/tcss562/project/etl/sales_data/

my_request["bucketname"] = "project.bucket.tcss562.vmp"
my_request['key'] = "100_Sales_Records.csv"

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

