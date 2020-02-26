# This is just to support Azure.
# If you are not deploying there this can be removed.
import io
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
# Define your FaaS Function here.
# Each platform handler will call and pass parameters to this function.
#
# @param request A JSON object provided by the platform handler.
# @param context A platform specific object used to communicate with the cloud platform.
# @returns A JSON object to use as a response.
#


def read_csv(csv_reader):
    list_of_rows = []
    try:
        for line in csv_reader:
            list_of_rows.append(line[:-1].split(","))

    except Exception as ex:
        print(ex.__str__())
    return list_of_rows

def write_csv(my_list):

    file1 = io.BytesIO()

    result = ""
    #for count,row in enumerate(my_list[0]):
    #    result += str(row)
    #   if count+1 != len(my_list[0]):
    #        result += ","
    #    else:
    #        result += ",Order Processing Time,Gross Margin\n"
    ids = set()
    result += my_list[0] + ",Order Processing Time, Gross Margin\n"
    for i in range(1, len(my_list)-1):
        col = len(my_list[i])
        uid = int(my_list[i][6])
        if ids.__contains__(uid) == False:
            for j in range(col):
                if j == 4:
                    val = my_list[i][4]
                    if val == "C":
                        result += "Critical"
                    elif val == "L":
                        result += "Low"
                    elif val == "M":
                        result += "Medium"
                    elif val == "H":
                        result += "High"
                else:
                    #file1.write(str.encode(my_list[i][j]))
                    result += my_list[i][j]
                if (j + 1) != col:
                    #file1.write(b",")
                    result += ","
                else:
                    date1 = my_list[i][5]
                    date2 = my_list[i][7]
                    date1_value = date1.split('/')
                    date2_value = date2.split('/')
                    month = int(date1_value[0])
                    day = int(date1_value[1])
                    year = int(date1_value[2])
                    month2 = int(date2_value[0])
                    day2 = int(date2_value[1])
                    year2 = int(date2_value[2])
                    order_time = ((year2 - year) * 365) + \
                        ((month2 - month) * 30) + (day2 - day)
                    gross_margin = float(
                        my_list[i][13]) / float(my_list[i][11])

                    #file1.write(b',' + str.encode(str(order_time)) + b', ' + str.encode(str(gross_margin)))
                    #file1.write(b'\n')
                    result += ", {0}, {1}".format(order_time, gross_margin)
                    result += "\n"
        else:
            ids.add(int(uid))
    file1.write(str.encode(result))


def yourFunction(request, context):
    # Import the module and collect data
    inspector = Inspector()
    inspector.inspectAll()

    bucketname = str(request['bucketname'])
    key = str(request['key'])
    s3 = boto3.client('s3')
    csvfile = s3.get_object(Bucket=bucketname, Key=key)
    csvcontent = csvfile['Body'].read().decode('utf-8').split("\n")

    content = read_csv(csvcontent)
    output = write_csv(content)
    bytes = output.getvalue()
    record_size = str(request['key']).split("_")
    dest_object_name = "{0}_newdata.csv".format(record_size[0])
    s3.put_object(Bucket=bucketname, Key=dest_object_name, Body=bytes)

    # Add custom message and finish the function
    if ('key' in request):
        inspector.addAttribute(
            "bucketname", "bucketname " + str(request['bucketname']) + "!")
        inspector.addAttribute("key", str(request['key']))
        inspector.addAttribute("test val", csvcontent[0])

    inspector.inspectAllDeltas()
    return inspector.finish()
