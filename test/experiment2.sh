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


#
# Generate 100 RDS instances for every experiment (100 to 1500000) config JSON files,
# In total 3*11*100 config files generated.
#

sub_configs_folder="experiment2_configs"

if [ ! -d "$sub_configs_folder" ]
then
    echo "----------- Create config folder ------------"
    mkdir ./$sub_configs_folder

    for i in $(seq 1 3)
    do
        mkdir ./$sub_configs_folder/experiment_s$i
        
        for file in $files
        do
            mkdir ./$sub_configs_folder/experiment_s$i/$file
            
            for cnt in $(seq 1 100)
            do
                echo "----- Generating config files \"sub_configs_folder/experiment_s$i/${file}_admin${cnt}.json\" -------"

                experiment_json=`cat ./experiment_s$i/$file.json | 
                    awk '/bucketname/ { gsub(/<bucket>/,BUCKET_NAME); print $0; next } { print $0 }' BUCKET_NAME=$BUCKET_NAME | 
                    awk '/dbName/ { gsub(/""/,DB_NAME); print $0; next } { print $0 }' DB_NAME="\"$DB_NAME\"" |
                    awk '/dbEndpoint/ { gsub(/""/,DB_ENDPOINT); print $0; next } { print $0 }' DB_ENDPOINT="\"admin$cnt$DB_ENDPOINT\""`

                echo $experiment_json > ./$sub_configs_folder/experiment_s$i/$file/${file}_admin${cnt}.json
            done
        done
    done
else
    echo "---------- $sub_configs_folder already exists ------------"
fi

#
# Scale the experiments from 10 to 100, in step 10.
# Function memory: 3008MB
# CSV size: 100000
#

sub_results_folder="experiment2_results"
mkdir ./$sub_results_folder

test_file="100000recordExperiment"
mkdir ./$sub_results_folder/$test_file

for lang in Python Java Go
do
    mkdir ./$sub_results_folder/$test_file/$lang
    for con in 1 10 20 30 40 50 # Current limitation is 50 instances, should be 100 instances
    do
        mkdir ./$sub_results_folder/$test_file/$lang/concurrency_$con
        for i in $(seq 1 11)
        do
            echo "----- Running iteration $i of $con concurrency in $lang -------"
            mkdir ./$sub_results_folder/$test_file/$lang/concurrency_$con/iteration_$i

            # ServiceOne
            mkdir ./$sub_results_folder/$test_file/$lang/concurrency_$con/iteration_$i/ServiceOne 
            for con_i in $(seq 1 $con)
            do
                ./faas_runner.py -e ./$sub_configs_folder/experiment_s1/$test_file/${test_file}_admin$(($con_i)).json -o ./$sub_results_folder/$test_file/$lang/concurrency_$con/iteration_$i/ServiceOne --function ServiceOne$lang $args &    
            done

            # Check if ServiceOne is done
            while 1
            do
                ps_ServiceOne=`ps aux | grep ServiceOne$lang | grep -v grep`
                if [ -z "$ps_ServiceOne" ]
                then
                    echo "--------- Iteration $i of $con concurrency in $lang ServiceOne done! --------"
                    break
                else
                    echo "--------- Iteration $i of $con concurrency in $lang ServiceOne still running ----------"
                fi
            done

            # ServiceTwo begins
            mkdir ./$sub_results_folder/$test_file/$lang/concurrency_$con/iteration_$i/ServiceTwo
            for con_i in $(seq 1 $con)
            do 
                ./faas_runner.py -e ./$sub_configs_folder/experiment_s2/$test_file/${test_file}_admin$(($con_i)).json -o ./$sub_results_folder/$test_file/$lang/concurrency_$con/iteration_$i/ServiceTwo --function ServiceTwo$lang $args &
            done

            # Check if ServiceTwo is done
            while 1
            do
                ps_ServiceTwo=`ps aux | grep ServiceTwo$lang | grep -v grep`
                if [ -z "$ps_ServiceTwo" ]
                then
                    echo "--------- Iteration $i of $con concurrency in $lang ServiceTwo done! --------"
                    break
                else
                    echo "--------- Iteration $i of $con concurrency in $lang ServiceTwo still running ----------"
                fi
            done

            # Service three begins
            mkdir ./$sub_results_folder/$test_file/$lang/concurrency_$con/iteration_$i/ServiceThree
            for con_i in $(seq 1 $con)
            do 
                ./faas_runner.py -e ./$sub_configs_folder/experiment_s3/$test_file/${test_file}_admin$(($con_i)).json -o ./$sub_results_folder/$test_file/$lang/concurrency_$con/iteration_$i/ServiceThree --function ServiceThree$lang $args &
            done

            # Check if ServiceThree is done
            while 1
            do
                ps_ServiceThree=`ps aux | grep ServiceThree$lang | grep -v grep`
                if [ -z "$ps_ServiceThree" ]
                then
                    echo "--------- Iteration $i of $con concurrency in $lang ServiceThree done! --------"
                    break
                else
                    echo "--------- Iteration $i of $con concurrency in $lang ServiceThree still running ----------"
                fi
            done
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
