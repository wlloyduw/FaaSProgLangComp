#!/bin/bash

# FaaS Programming Languages Comparison Experiment 3
# @author Robert Cordingly

# Remove folders: find . -name \*.json -exec mv {} . \;

args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCSV 0"

dataSize=100
bucket="project.fall19.tcss562.vmp"
endpoint="python.cluster-ctutcfcxozkc.us-east-1.rds.amazonaws.com"
name="DB_TCSS562"

subFolder="experiment3_results_rerunJava"
mkdir ./$subFolder

for lang in Python Java Go
do
    aws lambda update-function-configuration --function-name ServiceOne$lang --memory-size 3008
    aws lambda update-function-configuration --function-name ServiceTwo$lang --memory-size 3008
    aws lambda update-function-configuration --function-name ServiceThree$lang --memory-size 3008
done

for dataSize in 100
do

    payload1="[{\"bucketname\":\"$bucket\",\"key\":\"${dataSize}_Sales_Records.csv\"}]"
    payload2="[{\"bucketname\":\"$bucket\",\"key\":\"edited_${dataSize}_Sales_Records.csv\",\"tablename\":\"SalesData\",\"batchSize\": 1000,\"dbEndpoint\":\"$endpoint\",\"dbName\":\"$name\"}]"
    payload3="[{\"bucketname\":\"$bucket\",\"key\":\"QueryResults.csv\",\"tablename\":\"SalesData\",\"stressTestLoops\": 1,\"dbEndpoint\":\"$endpoint\",\"dbName\":\"$name\"}]"

    mkdir ./$subFolder/WARMUP
    mkdir ./$subFolder/COLD
    mkdir ./$subFolder/WARM

    for i in 1 2 3 4 5 6
    do
        mkdir ./$subFolder/WARMUP/Java
        mkdir ./$subFolder/COLD/Java
        mkdir ./$subFolder/WARM/Java

        ./faas_runner.py -o ./$subFolder/WARMUP/Java --function ServiceOneJavaWAKEUP $args --payloads $payload1
        ./faas_runner.py -o ./$subFolder/WARMUP/Java --function ServiceTwoJavaWAKEUP $args --payloads $payload2
        ./faas_runner.py -o ./$subFolder/WARMUP/Java --function ServiceThreeJavaWAKEUP $args --payloads $payload3

        for lang in Java
        do
            mkdir ./$subFolder/COLD/$lang
            mkdir ./$subFolder/WARM/$lang

            echo "----- Running iteration $i of results$dataSize in $lang -------"
            ./faas_runner.py -o ./$subFolder/COLD/$lang --function ServiceOne$lang $args --payloads $payload1
            ./faas_runner.py -o ./$subFolder/COLD/$lang --function ServiceTwo$lang $args --payloads $payload2
            ./faas_runner.py -o ./$subFolder/COLD/$lang --function ServiceThree$lang $args --payloads $payload3

            ./faas_runner.py -o ./$subFolder/WARM/$lang --function ServiceOne$lang $args --payloads $payload1
            ./faas_runner.py -o ./$subFolder/WARM/$lang --function ServiceTwo$lang $args --payloads $payload2
            ./faas_runner.py -o ./$subFolder/WARM/$lang --function ServiceThree$lang $args --payloads $payload3

        done

        echo "----- Finished iteration $i and sleeping: -------"

        for j in {1..60}
        do
            echo "Sleeping... $j/60"
            sleep 60
        done
    done
done

echo "Experiments Done!"