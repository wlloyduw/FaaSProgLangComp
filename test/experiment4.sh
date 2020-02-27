#!/bin/bash

# FaaS Programming Languages Comparison Experiment 1
# @author Robert Cordingly

args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCSV 0"

subFolder="experiment4_results"
mkdir ./$subFolder

for mem in 512 1024 2048 2560 3008
do
    mkdir ./$subFolder/$mem
    for lang in Python Java Go
    do
        echo "----- Changing Memory Settings... -------"
        aws lambda update-function-configuration --function-name ServiceOne$lang --memory-size $mem
        aws lambda update-function-configuration --function-name ServiceTwo$lang --memory-size $mem
        aws lambda update-function-configuration --function-name ServiceThree$lang --memory-size $mem

        mkdir ./$subFolder/$mem/$lang
        for i in 1 2 3 4 5 6 7 8 9 10 11
        do
            echo "----- Running iteration $i of $mem MBs in $lang -------"
            ./faas_runner.py -e ./experiment_s1/100000recordExperiment.json -o ./$subFolder/$mem/$lang --function ServiceOne$lang $args
            ./faas_runner.py -e ./experiment_s2/100000recordExperiment.json -o ./$subFolder/$mem/$lang --function ServiceTwo$lang $args
            ./faas_runner.py -e ./experiment_s3/100000recordExperiment.json -o ./$subFolder/$mem/$lang --function ServiceThree$lang $args
        done
    done
done

echo "Experiments Done!"