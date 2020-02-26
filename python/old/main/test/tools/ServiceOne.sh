#!/bin/bash

#562 Tutorial 4 - David Perez 
#JSON object to pass to Lambda Function
#json={"\"msg\"":"\"mymessage\",\"shift\"":1,\"param2\"":2,\"param3\"":3}


bucketname="testbucketohiodap";
key="562sales_small.csv";

json2={"\"bucketname\"":"\"$bucketname\"","\"key\"":"\"$key\""}


echo $json2 | jq

echo "Invoking Lambda function encode using API Gateway"
#time output=`curl -s -H "Content-Type: application/json" -X POST -d  $json2 https://yc67ejcsk9.execute-api.us-east-1.amazonaws.com/ServiceOne_dev`
time output=`aws lambda invoke --invocation-type RequestResponse --function-name  python-hello --region us-east-2 --payload $json2 /dev/stdout | head -n 1 | head -c -2 ; echo`

echo ""
echo "CURL ENCODE RESULT:"
echo $output
echo ""
echo ""



