#!/bin/bash
args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCsv 0"
bucket="project.fall19.tcss562.vmp"
endpoint="java.cluster-ctutcfcxozkc.us-east-1.rds.amazonaws.com"
name="TCSS_562DB"
datasize=875000
payload="[{\"bucketname\":\"$bucket\",\"key\":\"${datasize}_Sales_Records.csv\"}]"

#./faas_runner.py -o ./$subFolder/results/$datasize/Java --function ServiceOneJava $args --payloads $payload

time output=`aws lambda invoke --invocation-type RequestResponse --function-name  ServiceOneJava --region us-east-1 --payload $payload /dev/stdout | head -n 1 | head -c -2 ; echo`

echo $output
