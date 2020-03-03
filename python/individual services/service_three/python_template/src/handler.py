# This is just to support Azure.
# If you are not deploying there this can be removed.
import time
from Inspector import *
import logging
import json
import os
import sys
import boto3
import pymysql
import io

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

#import pandas as pd


#
# Define your FaaS Function here.
# Each platform handler will call and pass parameters to this function.
#
# @param request A JSON object provided by the platform handler.
# @param context A platform specific object used to communicate with the cloud platform.
# @returns A JSON object to use as a response.
#

def yourFunction(request, context):

    dbEndpoint = os.getenv('databaseEndpoint')
    if 'dbEndpoint' in request:
        dbEndpoint = request['dbEndpoint']
    
    dbName = os.getenv('databaseName')
    if 'dbName' in request:
        dbName = request['dbName']
        
    key = str(request['key'])
    bucketname = str(request['bucketname'])
    tablename = str(request['tablename'])
    stressTestLoops = request['stressTestLoops']

    # import the module and collect data
    inspector = Inspector()
    inspector.inspectAll()
    inspector.addAttribute("endpoint", dbEndpoint)
    inspector.addAttribute("bucketname", bucketname)
    inspector.addAttribute("key", key)

    s3 = boto3.client('s3')

    request['filterBy'] = dict()
    request['filterBy']["Region"] = ["Australia and Oceania"]
    request['filterBy']["Item Type"] = ["Office Supplies"]
    request['filterBy']["Sales Channel"] = ["Office Supplies"]
    request['filterBy']["Order Priority"] = ["Offline"]
    request['filterBy']["Country"] = ["Fiji"]

    request['aggregateBy'] = dict()
    request['aggregateBy']["max"] = ["Units Sold"]
    request['aggregateBy']["min"] = ["Units Sold"]
    request['aggregateBy']["avg"] = ["Order Processing Time", "Gross Margin", "Units Sold"]
    request['aggregateBy']["sum"] = ["Units Sold", "Total Revenue", "Total Profit"]

    query_string = contstruct_query_string(request['filterBy'], request['aggregateBy'], request['tablename'])
    query_result = exexute_query(query_string, dbEndpoint, dbName)
    stressTest(stressTestLoops, tablename, dbEndpoint, dbName)

    key_split = str(request['key']).split('_')[0]
    result_key = "{0}_results.csv".format(key_split)
    csv_content = convert_rs_to_csv(query_result)
    s3.put_object(Bucket=bucketname, Key=result_key, Body=(csv_content))

    inspector.inspectAllDeltas()
    return inspector.finish()


def convert_rs_to_csv(result_set):

    csv_content = ""
    for row in result_set:
        for item in row:
            if item == None:
                csv_content = csv_content + ','
            elif isinstance(item, float):
                csv_content = csv_content + str(item) + ','
            else:
                csv_content = csv_content + item + ','
        csv_content = csv_content + "\n"
    return csv_content


def contstruct_query_string(filterBy, aggregateBy, tablename):
    aggr = ""
    for _i, key in enumerate(aggregateBy):
        for _j, val in enumerate(aggregateBy[str(key)]):
            aggr += key.upper()
            aggr += "(`"
            temp = str.replace(val, "_", " ")
            aggr += str(temp)
            aggr += "`), "
    fil = ""
    for _i, key in enumerate(filterBy):
        for _j, val in enumerate(filterBy[str(key)]):
            fil += "SELECT "
            fil += aggr
            fil += "'WHERE "
            temp_key = str.replace(key, "_", " ")
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


def exexute_query(query_string, dbEndPoint, dbName):
    rows = {}
    try:
        print("Connecting...")

        con = pymysql.connect(host=dbEndPoint, user=os.getenv('username'), password=os.getenv('password'), db=dbName, connect_timeout=350000)

        print("Connected to db")
        cursor = con.cursor()

        print("Executing Long Running Query")

        cursor.execute(query_string)
        rows = cursor.fetchall()
        con.close()

    except Exception as ex:
        print(ex.args)
    finally:
        print("Closed DB Connection") 
    return rows


def convert_query_to_json(rows):
    json_result = json.dumps(rows)
    return json_result


def convert_json_csv(rows):
    file = io.BytesIO()

    file.write(str(rows[0])[1:-1].replace(" ", ""))

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


def stressTest(iterations, tablename, dbEndpoint, dbName):
    con = pymysql.connect(host=dbEndpoint, user=os.getenv('username'), password=os.getenv('password'), db=dbName, connect_timeout=350000)

    with con:
        cur = con.cursor()

        for _i in range(0, iterations):
            cur.execute("SELECT * FROM {}".format(tablename))
            cur.fetchall()
