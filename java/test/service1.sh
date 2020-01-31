bucketname="testbucketohiodap";
key="562sales_50000.csv";

json={"\"bucketname\"":"\"$bucketname\"","\"key\"":"\"$key\""}



echo "Invoking Lambda function service 1 load and transform using AWS cli"
#time output=`curl -s -H "Content-Type: application/json" -X POST -d  $json https://yc67ejcsk9.execute-api.us-east-1.amazonaws.com/ServiceOne_dev`
time output=`aws lambda invoke --invocation-type RequestResponse --function-name  ServiceOne --region us-east-2 --payload $json /dev/stdout | head -n 1 | head -c -2 ; echo`

echo ""
echo "CURL ENCODE RESULT:"
echo $output
echo ""
echo ""

