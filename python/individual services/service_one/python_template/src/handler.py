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
import io

#
# Define your FaaS F    unction here.
# Each platform handler will call and pass parameters to this function.
# 
# @param request A JSON object provided by the platform handler.
# @param context A platform specific object used to communicate with the cloud platform.
# @returns A JSON object to use as a response.
#

def addColumn(filename):
    
    try:
        linesep = os.linesep
        (f, ext) = os.path.splitext(filename) 
        file2 =  open(f+str(.1)+ext, "w+")
        with open(filename, "r") as file1:
            for l in file1:
                split = l.splitlines()[0]
                file2.write(split+"a"+linesep)
    except Exception as ex:
        print(ex.__str__())
    finally:
        file1.close()
        file2.close()

def read_csv(csv_reader): 
    list = []
    try:
        temp = csv.reader(csv_reader, delimiter=',')
        for row in temp:
            list.append(row)
    
    except Exception as ex:
        print(ex.__str__())

    return list

def write_csv(my_list):

    file1 = io.BytesIO()
    write_csv_to_BytesIO(file1, my_list)
    
    return file1

def write_csv_to_BytesIO(file1, my_list):

    result = ""
    for count,row in enumerate(my_list[0]):
        result += str(row)
        #file1.write(str.encode(row))
        if count+1 != len(my_list[0]):
            result += ","
            #file1.write(b",")
        else:
            #file1.write(b', Oder Processing Time, Gross Margin')
            #file1.write(b'\n')
            result += ", Oder Processing Time, Gross Margin"
            result += "\n"
            
    ids = set()

    for i in range(1, len(my_list)-1):

        col = len(my_list[i])
      
        uid = int(my_list[i][6])

        if ids.__contains__(uid) == False:
            for j in range(col):
                if j == 4:
                    val = my_list[i][4]
                    if val == "C":
                        #file1.write(b"Critical")
                        result += "Critical"
                    elif val == "L":
                        #file1.write(b'Low')
                        result += "Low"
                    elif val == "M":
                        #file1.write(b'Medium')
                        result += "Medium"
                    elif val == "H":
                        #file1.write(b'High')
                        result += "High"
                else :
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

                    order_time= ((year2 - year) * 365) + ((month2 - month) * 30) + (day2 - day)
                    
                    gross_margin = float(my_list[i][13]) / float(my_list[i][11])

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

    inspector.addTimeStamp("frameworkRuntime")

    bucketname = str(request['bucketname'])

    key = str(request['key'])

    s3 = boto3.client('s3')

    csvfile = s3.get_object(Bucket=bucketname, Key=key)
    
    csvcontent = csvfile['Body'].read().decode('utf-8').split("\n")

    test_val=""

    content = read_csv(csvcontent)

    output = write_csv(content)
    
    bytes = output.getvalue();

    record_size = str(request['key']).split("_")

   
    dest_object_name = "{0}_newdata.csv".format(record_size[0])

    s3.put_object(Bucket=bucketname, Key=dest_object_name, Body=bytes)

    # Add custom message and finish the function
    if ('key' in request):
        inspector.addAttribute("bucketname", "bucketname " + str(request['bucketname']) + "!")
        inspector.addAttribute("key", str(request['key']))
        inspector.addAttribute("test val", csvcontent[0])


    
    inspector.inspectCPUDelta()
    return inspector.finish()
