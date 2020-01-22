# This is just to support Azure.
# If you are not deploying there this can be removed.
import os
import sys
import boto3
import csv
import pymysql
import io

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

import json
import logging
#import pandas as pd
from Inspector import *

import time

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

    query_string = contstruct_query_string(request['filterBy'], request['aggregateBy'], request['tablename'])

    query_result = exexute_query(query_string)

    json_result = convert_query_to_json(query_result)

    csv_result = convert_json_csv(query_result)

    #dest_object_name = "newjson.txt"

    #my_bytes = bytes(json_result.encode('UTF-8'))

    #s3.put_object(Bucket=bucketname, Key=dest_object_name,Body=(my_bytes))

    my_bytes = bytes(csv_result.getvalue())

    key_split = str(request['key']).split('_')[0]

    result_key = "{0}_results.csv".format(key_split)
    
    s3.put_object(Bucket=bucketname, Key=result_key,Body=(my_bytes))
    
    #bytes = csv_result.getvalue()

    # Add custom message and finish the function
    if ('key' in request):
        inspector.addAttribute("bucketname", "bucketname " + str(request['bucketname']) + "!")
        inspector.addAttribute("key", str(request['key']))
        inspector.addAttribute("test val", csvcontent[0])

    inspector.inspectCPUDelta()
    return inspector.finish()


def contstruct_query_string(filterBy, aggregateBy, tablename):
    aggr = ""
    for i, key in enumerate(aggregateBy):
        for j, val in enumerate(aggregateBy[str(key)]):
            aggr += key.upper()
            aggr += "(`"
            temp = str.replace(val, "_", " ")
            aggr += str(temp)
            aggr += "`), "
    fil = ""
    for i, key in enumerate(filterBy):
        for j, val in enumerate(filterBy[str(key)]):
            fil += "SELECT "
            fil += aggr
            fil += "'WHERE "
            temp_key = str.replace(key, "_", " " )
            fil += temp_key
            fil += "="
            temp_val = str.replace(val, "_", " ")
            fil += temp_val
            fil += "' AS `Filtered By` FROM "
            fil += tablename
            fil += " WHERE `"
            fil += temp_key
            fil += "`='"
            fil += temp_val
            fil += "' UNION "
    k = fil.rfind(" UNION ")
    result = fil[:k]
    result += ";"   
    return result

def exexute_query(query_string):
    rows = {}
    try:
        print("Connecting...")
        
        con = pymysql.connect(host="tcss562group2.cluster-cj6rdxvm4ac3.us-east-2.rds.amazonaws.com", 
        user="tscc562", password="m23j452345", db="562Group2DB", connect_timeout=1800, cursorclass=pymysql.cursors.DictCursor)
        
        print("Connected to db") 
        
        cursor = con.cursor()
        
        print("Executing Long Running Query")
        
        cursor.execute(query_string)

        rows = cursor.fetchall()


    except Exception as ex:
        print(ex.args)
    finally:
        print("Closed DB Connection") 
        con.close()  
    return rows

def convert_query_to_json(rows):
    json_result = json.dumps(rows)
    return json_result       

def convert_json_csv(rows):
    file = io.BytesIO()

    file.write(str.encode(",".join(rows[0].keys())))

    file.write(b'\n')

    value = ""

    for i in range(0, len(rows)):
        for key in rows[i].keys():
            value += str(rows[i].get(key)) + ','
        k = str.rfind(value, ',')
        temp = value[:k]
        value = temp
        value += "\n"
    file.write(str.encode(value))

    return file

