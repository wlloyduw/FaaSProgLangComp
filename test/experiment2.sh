#!/bin/bash

# FaaS Programming Languages Comparison Experiment 2
# @author Hanfei Yu


BUCKET_NAME="project.bucket.tcss562.sps"
DB_NAME="DB_TCSS562"
DB_ENDPOINT=".cluster-cftyxgwyrild.us-east-1.rds.amazonaws.com"

files="100recordExperiment 1000recordExperiment 5000recordExperiment
    10000recordExperiment 50000recordExperiment 100000recordExperiment
    500000recordExperiment 1000000recordExperiment 1500000recordExperiment"

args="--runs 1 --threads 1 --warmupBuffer 0 --combineSheets 0 --sleepTime 0 --openCSV 0"

sub_results_folder="experiment2_results"
if [ -d "./$sub_results_folder" ]
then
    rm -rf ./$sub_results_folder
    mkdir ./$sub_results_folder
else
    mkdir ./$sub_results_folder
fi

test_size="100000"
test_file="100000recordExperiment.json"
mkdir ./$sub_results_folder/$test_size

# Father payloads
parentPayload1="{\"bucketname\":\"$BUCKET_NAME\",\"key\":\"${test_size}_Sales_Records.csv\"}"
parentPayload2="{\"bucketname\":\"$BUCKET_NAME\",\"key\":\"edited_${test_size}_Sales_Records.csv\",\"tablename\":\"SalesData\",\"batchSize\":1000,\"dbEndpoint\":\"admin${DB_ENDPOINT}\",\"dbName\":\"$DB_NAME\"}"
parentPayload3="{\"bucketname\":\"$BUCKET_NAME\",\"key\":\"QueryResults.csv\",\"tablename\":\"SalesData\",\"stressTestLoops\":1,\"dbEndpoint\":\"admin${DB_ENDPOINT}\",\"dbName\":\"$DB_NAME\"}"            

for lang in Python Java Go
do
    mkdir ./$sub_results_folder/$test_size/$lang
    for con in 1 5 10 15 20 25 30 35 40 45 50 # Current limitation is 50 instances, should be 100 instances
    do
        mkdir ./$sub_results_folder/$test_size/$lang/concurrency_$con

        # Generate payloads
        payloads1="["
        payloads2="["
        payloads3="["

        for con_i in $(seq 1 $con)
        do
            payloads1="$payloads1{\"dbEndpoint\":\"admin${con_i}${DB_ENDPOINT}\"}"
            payloads2="$payloads2{\"dbEndpoint\":\"admin${con_i}${DB_ENDPOINT}\"}"
            payloads3="$payloads3{\"dbEndpoint\":\"admin${con_i}${DB_ENDPOINT}\"}"
        
            if [ "$con_i" -lt "$con" ]
            then
                payloads1="$payloads1,"
                payloads2="$payloads2,"
                payloads3="$payloads3,"
            else
                payloads1="$payloads1]"
                payloads2="$payloads2]"
                payloads3="$payloads3]"
            fi
        done
        
        # Repeat each concurrency number for 11 times
        for i in $(seq 1 11)
        do
            echo "----- Running iteration $i of $con concurrency in $lang -------"
            mkdir ./$sub_results_folder/$test_size/$lang/concurrency_$con/iteration_$i
            
            # ServiceOne
            ./faas_runner.py -o ./$sub_results_folder/$test_size/$lang/concurrency_$con/iteration_$i --function ServiceOne$lang $args --parentPayload $parentPayload1 --payloads $payloads1  

            # ServiceTwo
            ./faas_runner.py -o ./$sub_results_folder/$test_size/$lang/concurrency_$con/iteration_$i --function ServiceTwo$lang $args --parentPayload $parentPayload2 --payloads $payloads2   

            # ServiceThree
            ./faas_runner.py -o ./$sub_results_folder/$test_size/$lang/concurrency_$con/iteration_$i --function ServiceThree$lang $args --parentPayload $parentPayload3 --payloads $payloads3
        done
    done
done

echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo "##############################################################"
echo "**************************************************************"
echo "************* Experiments Finally Done! Hurray! **************"
echo "**************************************************************"
echo "##############################################################"
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
