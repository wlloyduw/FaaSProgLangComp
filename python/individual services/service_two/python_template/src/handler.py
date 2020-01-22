# This is just to support Azure.
# If you are not deploying there this can be removed.
import os
import sys
import boto3
import csv


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

import json
import logging
#import pandas as pd
from Inspector import *
import time
import pymysql


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
    inspector.addTimeStamp("frameworkRuntime")
    bucketname = str(request['bucketname'])
    key = str(request['key'])

    s3 = boto3.client('s3')
    csvfile = s3.get_object(Bucket=bucketname, Key=key)
    csvcontent = csvfile['Body'].read().split(b'\n')
    i = 0
    for line in csvcontent:
        csvcontent[i] = line.decode("utf-8")
        i = i+1
    csv_data = csv.DictReader(csvcontent)
    test_val=""
    content = read_content(csvcontent)
    output = write_output(content)

    # Add custom message and finish the function
    if ('key' in request):
        inspector.addAttribute("bucketname", "bucketname " + str(request['bucketname']) + "!")
        inspector.addAttribute("key", str(request['key']))
        inspector.addAttribute("test val", csvcontent[0])
    
    inspector.inspectCPUDelta()
    return inspector.finish()

def read_content(content):
    list = []
    try:
        temp = csv.reader(content, delimiter=',')
        for row in temp:
            list.append(row)
    
    except Exception as ex:
        print(ex.__str__())

    return list

def write_output(content ):
    try:
        print("Connecting...")

        con = pymysql.connect(host="tcss562group2.cluster-cj6rdxvm4ac3.us-east-2.rds.amazonaws.com", 
        user="tscc562", password="m23j452345", db="562Group2DB", connect_timeout=350000)
        
        print("Connected to db")

        with con:
            cursor = con.cursor()
            cursor.execute("DROP TABLE IF EXISTS mytable")

            print("Removed mytable")

            insert_query=("INSERT INTO mytable (Region, Country, `Item Type` , `Sales Channel` , `Order Priority` ,`Order Date`,  `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Oder Processing Time`, `Gross Margin`) VALUES (%s, %s, %s, %s, %s,%s, %s, %s, %s, %s,%s, %s, %s, %s, %s, %s)")
            
            print("Connecting to DB")
            
            cursor.execute("CREATE TABLE mytable(Region VARCHAR(50), Country VARCHAR(50), `Item Type` VARCHAR(50), `Sales Channel` VARCHAR(50), `Order Priority` VARCHAR(50),`Order Date` VARCHAR(50), `Order ID` int, `Ship Date` VARCHAR(50), `Units Sold` DOUBLE, `Unit Price` DOUBLE, `Unit Cost` DOUBLE, `Total Revenue` DOUBLE, `Total Cost` DOUBLE, `Total Profit` DOUBLE, `Oder Processing Time` DOUBLE, `Gross Margin` DOUBLE )  ")

            print("Connection is OPEN")
            
            my_data = []
            for i in range(0, len(content) -1):
                my_data.append((content[i][0], content[i][1], content[i][2], content[i][3], 
                content[i][4], content[i][5], content[i][6], content[i][7], 
                content[i][8], content[i][9], content[i][10], content[i][11], 
                content[i][12], content[i][13], content[i][14], content[i][15]))
            
            cursor.executemany(insert_query, my_data)
        
            cursor.execute("ALTER TABLE mytable ORDER BY `Order ID`") 

            con.commit()
            cursor.close()
            con.close()
    except Exception as ex:
        print(ex.args)
    
      
