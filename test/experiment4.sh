#!/bin/bash

# FaaS Programming Languages Comparison Experiment 4
# @author Robert Cordingly

# Remove folders: find . -name \*.json -exec mv {} . \;

args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCSV 0"

dataSize=500000
bucket="project.fall19.tcss562.vmp"
endpoint="python.cluster-ctutcfcxozkc.us-east-1.rds.amazonaws.com"
name="DB_TCSS562"

subFolder="experiment4_results_500000"
mkdir ./$subFolder

for mem in 3008 2560 2048 1536 1024 768 512
do
    mkdir ./$subFolder/$mem
    for lang in Java Python Go
    do
        echo "----- Changing Memory Settings... -------"
        aws lambda update-function-configuration --function-name ServiceOne$lang --memory-size $mem
        aws lambda update-function-configuration --function-name ServiceTwo$lang --memory-size $mem
        aws lambda update-function-configuration --function-name ServiceThree$lang --memory-size $mem

        mkdir ./$subFolder/$mem/$lang
        for i in 1 2 3 4 5 6 7 8 9 10 11
        do
            payload1="[{\"bucketname\":\"$bucket\",\"key\":\"${dataSize}_Sales_Records.csv\"}]"
            payload2="[{\"bucketname\":\"$bucket\",\"key\":\"edited_${dataSize}_Sales_Records.csv\",\"tablename\":\"SalesData\",\"batchSize\": 1000,\"dbEndpoint\":\"$endpoint\",\"dbName\":\"$name\"}]"
            payload3="[{\"bucketname\":\"$bucket\",\"key\":\"QueryResults.csv\",\"tablename\":\"SalesData\",\"stressTestLoops\": 1,\"dbEndpoint\":\"$endpoint\",\"dbName\":\"$name\"}]"

            echo "----- Running iteration $i of $mem MBs in $lang -------"
            ./faas_runner.py -o ./$subFolder/$mem/$lang --function ServiceOne$lang $args --payloads $payload1
            ./faas_runner.py -o ./$subFolder/$mem/$lang --function ServiceTwo$lang $args --payloads $payload2
            ./faas_runner.py -o ./$subFolder/$mem/$lang --function ServiceThree$lang $args --payloads $payload3
        done
    done
done

echo "Experiments Done!"