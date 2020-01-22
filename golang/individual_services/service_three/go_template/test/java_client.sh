#!/bin/bash

#Columns to filter data by
Region=["\"Australia\"","\"Oceania\""]
Item_Type=["\"Office_Supplies\""]
Sales_Channel=["\"Offline\""]
Order_Priority=["\"Medium\""]
Country=["\"Fiji\""]
filterBy="{\"Region\":$Region,\"Item_Type\":$Item_Type,\"Sales_Channel\":$Sales_Channel,\"Order_Priority\":$Order_Priority,\"Country\":$Country}"

#Columns to perform aggregations on
max=["\"Units_Sold\""];
min=["\"Units_Sold\""];
avg=["\"Order_Processing_Time\"","\"Gross_Margin\"","\"Units_Sold\""]
sum=["\"Units_Sold\"","\"Total_Revenue\"","\"Total_Profit\""]


aggregateBy="{\"max\":$max,\"min\":$min,\"avg\":$avg,\"sum\":$sum}"
aggregateByAsString="$(echo $aggregateBy |jq tojson)"
filterByAsString="$(echo $filterBy |jq tojson)"

bucketname="testbucketohiodap";
key="562sales_small.csv";
tablename="mytable";
json={"\"filterBy\"":$filterByAsString,"\"aggregateBy\"":$aggregateByAsString,"\"bucketname\"":"\"$bucketname\"","\"key\"":"\"$key\"","\"tablename\"":"\"$tablename\""}



echo "Invoking Lambda function service 1 load and transform using AWS cli"
#time output=`curl -s -H "Content-Type: application/json" -X POST -d  $json2 https://yc67ejcsk9.execute-api.us-east-1.amazonaws.com/ServiceOne_dev`
time output=`aws lambda invoke --invocation-type RequestResponse --function-name  ServiceOne --region us-east-2 --payload $json /dev/stdout | head -n 1 | head -c -2 ; echo`

echo ""
echo "CURL ENCODE RESULT:"
echo $output
echo ""
echo ""


key="562sales_small_new.csv";
json={"\"filterBy\"":$filterByAsString,"\"aggregateBy\"":$aggregateByAsString,"\"bucketname\"":"\"$bucketname\"","\"key\"":"\"$key\"","\"tablename\"":"\"$tablename\""}

echo "Invoking Lambda function service 2 load to database using AWS cli"
time output=`aws lambda invoke --invocation-type RequestResponse --function-name  ServiceTwo --region us-east-2 --payload $json /dev/stdout | head -n 1 | head -c -2 ; echo`
echo ""
echo "AWS CLI RESULT:"
echo $output
echo ""

echo "Invoking Lambda function service 3 query and write as json"
time output=`aws lambda invoke --invocation-type RequestResponse --function-name ServiceThree --region us-east-2 --payload $json /dev/stdout | head -n 1 | head -c -2 ; echo`
echo ""
echo "AWS CLI RESULT:"
echo $output
echo ""

