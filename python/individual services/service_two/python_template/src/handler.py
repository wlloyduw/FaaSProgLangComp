# This is just to support Azure.
# If you are not deploying there this can be removed.
import pymysql
import time
from Inspector import *
import logging
import json
import os
import sys
import boto3
import csv


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

#import pandas as pd


#
# Define your FaaS F    unction here.
# Each platform handler will call and pass parameters to this function.
#
# @param request A JSON object provided by the platform handler.
# @param context A platform specific object used to communicate with the cloud platform.
# @returns A JSON object to use as a response.
#
def yourFunction(request, context):
    # Import the module and collect data
    inspector = Inspector()
    inspector.inspectAll()
    inspector.addAttribute("endpoint", os.getenv('databaseEndpoint'))
    bucketname = str(request['bucketname'])
    key = str(request['key'])

    s3 = boto3.client('s3')
    csvfile = s3.get_object(Bucket=bucketname, Key=key)
    csvcontent = csvfile['Body'].read().split(b'\n')
    i = 0
    for line in csvcontent:
        csvcontent[i] = line.decode("utf-8")
        i += 1
    csv_data = csv.DictReader(csvcontent)

    test_val = ""
    content = read_csv(csvcontent, inspector)
    output = write_output(content, request["batchSize"], request["tablename"], inspector)

    # Add custom message and finish the function
    if ('key' in request):
        inspector.addAttribute(
            "bucketname", "bucketname " + str(request['bucketname']) + "!")
        inspector.addAttribute("key", str(request['key']))
        inspector.addAttribute("test val", csvcontent[0])

    inspector.inspectAllDeltas()
    return inspector.finish()


def read_csv(content, inspector):
    list_of_rows = []
    try:
        for line in content:
            list_of_rows.append(line.split(","))

    except Exception as ex:
        inspector.addAttribute("error1", ex.args)
        print(ex.__str__())

    return list_of_rows

def write_output(content, batchSize, tablename, inspector):
    try:
        print("Connecting...")
        con = pymysql.connect(host=os.getenv('databaseEndpoint'), user=os.getenv('username'), password=os.getenv('password'), db=os.getenv('databaseName'), connect_timeout=350000)
        
        print("Connected to db")

        with con:
            cursor = con.cursor()
            cursor.execute("DROP TABLE IF EXISTS " + tablename)

            insert_query = ("INSERT INTO " + tablename + " (Region, Country, `Item Type` , `Sales Channel` , `Order Priority` ,`Order Date`,  `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Order Processing Time`, `Gross Margin`) VALUES (%s, %s, %s, %s, %s,%s, %s, %s, %s, %s,%s, %s, %s, %s, %s, %s)")
            cursor.execute("CREATE TABLE " + tablename + "(Region VARCHAR(50), Country VARCHAR(50), `Item Type` VARCHAR(50), `Sales Channel` VARCHAR(50), `Order Priority` VARCHAR(50),`Order Date` VARCHAR(50), `Order ID` int, `Ship Date` VARCHAR(50), `Units Sold` DOUBLE, `Unit Price` DOUBLE, `Unit Cost` DOUBLE, `Total Revenue` DOUBLE, `Total Cost` DOUBLE, `Total Profit` DOUBLE, `Order Processing Time` DOUBLE, `Gross Margin` DOUBLE )  ")

            my_data = []
            for i in range(1, len(content) - 1):
                my_data.append((content[i][0], content[i][1], content[i][2], content[i][3],
                                content[i][4], content[i][5], content[i][6], content[i][7],
                                content[i][8], content[i][9], content[i][10], content[i][11],
                                content[i][12], content[i][13], content[i][14], content[i][15]))

                if i % batchSize == 0:
                    cursor.executemany(insert_query, my_data)
                    my_data = []
 
            if len(my_data) != 0:
                cursor.executemany(insert_query, my_data)

            cursor.execute("ALTER TABLE " + tablename + " ORDER BY `Order ID`")

            con.commit()
            cursor.close()
    except Exception as ex:
        inspector.addAttribute("error2", ex.args)
        print(ex.args)
