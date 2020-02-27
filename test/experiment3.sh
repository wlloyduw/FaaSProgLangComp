#!/bin/bash

# FaaS Programming Languages Comparison Experiment 3
# @author Robert Cordingly

args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCSV 0"

subFolder="experiment3_results"
mkdir ./$subFolder

for file in 100recordExperiment 1500000recordExperiment
do
    mkdir ./$subFolder/$file
    for lang in Python Java Go
    do
        mkdir ./$subFolder/$file/$lang
        for i in 1 2 3 4 5 6 7 8 9 10 10
        do
            echo "----- Running iteration $i of $file in $lang -------"
            ./faas_runner.py -e ./experiment_s1/$file.json -o ./$subFolder/$file/$lang --function ServiceOne$lang $args
            ./faas_runner.py -e ./experiment_s2/$file.json -o ./$subFolder/$file/$lang --function ServiceTwo$lang $args
            ./faas_runner.py -e ./experiment_s3/$file.json -o ./$subFolder/$file/$lang --function ServiceThree$lang $args

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