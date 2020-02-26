#!/bin/bash

echo "Running 100 record experiments...."

mkdir ./experiment3_results_100
output="./experiment3_results_100"

args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCSV 0"

for i in 1 2 3 4 5 6 7 8 9 10
do
    echo "----- Running iteration $i: -------"

    ./faas_runner.py -e ./experiment_s1/100recordExperiment.json -o $output --function ServiceOnePython $args
    ./faas_runner.py -e ./experiment_s2/100recordExperiment.json -o $output --function ServiceTwoPython $args
    ./faas_runner.py -e ./experiment_s3/100recordExperiment.json -o $output --function ServiceThreePython $args

    ./faas_runner.py -e ./experiment_s1/100recordExperiment.json -o $output --function ServiceOneJava $args
    ./faas_runner.py -e ./experiment_s2/100recordExperiment.json -o $output --function ServiceTwoJava $args
    ./faas_runner.py -e ./experiment_s3/100recordExperiment.json -o $output --function ServiceThreeJava $args

    ./faas_runner.py -e ./experiment_s1/100recordExperiment.json -o $output --function ServiceOneGo $args
    ./faas_runner.py -e ./experiment_s2/100recordExperiment.json -o $output --function ServiceTwoGo $args
    ./faas_runner.py -e ./experiment_s3/100recordExperiment.json -o $output --function ServiceThreeGo $args

    echo "----- Finished iteration $i and sleeping: -------"

    for j in {1..60}
    do
        echo "Sleeping... $j/60"
        sleep 60
    done
done

echo "Running 15000000 record experiments...."

mkdir ./experiment3_results_1500000
output="./experiment3_results_1500000"

for i in 1 2 3 4 5 6 7 8 9 10
do
    echo "----- Running iteration $i: -------"

    ./faas_runner.py -e ./experiment_s1/1500000recordExperiment.json -o $output --function ServiceOnePython $args
    ./faas_runner.py -e ./experiment_s2/1500000recordExperiment.json -o $output --function ServiceTwoPython $args
    ./faas_runner.py -e ./experiment_s3/1500000recordExperiment.json -o $output --function ServiceThreePython $args

    ./faas_runner.py -e ./experiment_s1/1500000recordExperiment.json -o $output --function ServiceOneJava $args
    ./faas_runner.py -e ./experiment_s2/1500000recordExperiment.json -o $output --function ServiceTwoJava $args
    ./faas_runner.py -e ./experiment_s3/1500000recordExperiment.json -o $output --function ServiceThreeJava $args

    ./faas_runner.py -e ./experiment_s1/1500000recordExperiment.json -o $output --function ServiceOneGo $args
    ./faas_runner.py -e ./experiment_s2/1500000recordExperiment.json -o $output --function ServiceTwoGo $args
    ./faas_runner.py -e ./experiment_s3/1500000recordExperiment.json -o $output --function ServiceThreeGo $args

    echo "----- Finished iteration $i and sleeping: -------"

    for j in {1..60}
    do
        echo "Sleeping... $j/60"
        sleep 60
    done
done