#!/bin/bash

# FaaS Programming Languages Comparison Experiment 1
# @author Robert Cordingly

args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCSV 0"

dataSize=100
bucket="project.fall19.tcss562.vmp"
endpoint="python.cluster-ctutcfcxozkc.us-east-1.rds.amazonaws.com"
name="DB_TCSS562"

subFolder="experiment1_results"
mkdir ./$subFolder

for lang in Python Java Go
do
    aws lambda update-function-configuration --function-name ServiceOne$lang --memory-size 3008
    aws lambda update-function-configuration --function-name ServiceTwo$lang --memory-size 3008
    aws lambda update-function-configuration --function-name ServiceThree$lang --memory-size 3008
done

for dataSize in 100 1000 50000 10000 50000 100000 250000 500000
do
    mkdir ./$subFolder/results$dataSize
    for i in 1 2 3 4 5 6 7 8 9 10 11
    do
        for lang in Hybrid
        do
            mkdir ./$subFolder/results$dataSize/Hybrid

            payload1="[{\"bucketname\":\"$bucket\",\"key\":\"${dataSize}_Sales_Records.csv\"}]"
            payload2="[{\"bucketname\":\"$bucket\",\"key\":\"edited_${dataSize}_Sales_Records.csv\",\"tablename\":\"SalesData\",\"batchSize\": 1000,\"dbEndpoint\":\"$endpoint\",\"dbName\":\"$name\"}]"
            payload3="[{\"bucketname\":\"$bucket\",\"key\":\"QueryResults.csv\",\"tablename\":\"SalesData\",\"stressTestLoops\": 1,\"dbEndpoint\":\"$endpoint\",\"dbName\":\"$name\"}]"

            echo
            echo
            echo "----- Running iteration $i of results$dataSize in $lang -------"
            echo
            echo

            echo
            echo "Service 1:"
            echo
            ./faas_runner.py -o ./$subFolder/results$dataSize/Hybrid --function ServiceOneGo $args --payloads $payload1

            echo
            echo "Service 2:"
            echo
            ./faas_runner.py -o ./$subFolder/results$dataSize/Hybrid --function ServiceTwoJava $args --payloads $payload2

            echo
            echo "Service 3:"
            echo
            ./faas_runner.py -o ./$subFolder/results$dataSize/Hybrid --function ServiceThreeGo $args --payloads $payload3
        done
    done
done

echo "Experiments Done!"