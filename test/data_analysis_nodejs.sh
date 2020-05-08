#! /bin/bash

LANGS="NodeJS"
SERVICES="ServiceOne ServiceTwo ServiceThree"
PATH_SUFFIX="-DEFAULT-EXP-0MBs-run0"
PATH_PREFIX="./experiment2_results/"
OUTPUT_PATH="./experiment2_results_analysis"
METRICS="runtime cpuUsr cpuNice cpuKrn cpuIdle cpuIowait cpuIrq cpuSoftIrq vmcpusteal"

cons="1 5 10 15 20 25 30 35 40 45 50"
con_max="50"
iter="11"
data_size="100000"


if [ -d "$OUTPUT_PATH" ]
then
    rm -rf $OUTPUT_PATH
    mkdir $OUTPUT_PATH
else
    mkdir $OUTPUT_PATH
fi


for lang in $LANGS
do
    for service in $SERVICES
    do
        output_file="$OUTPUT_PATH/${service}${lang}.csv"
        header="concurrency,1,5,10,15,20,25,30,35,40,45,50"
        echo $header > $output_file
        
        runtime_row="runtime,"
       
        for con in $cons
        do
            runtime_con=0
			cnt=0

            for i in $(seq 2 $iter)
            do
                echo "------------- Analyzing iteration $i, concurrency $con, $service, $lang results --------------"

                runs=$(($con-1))
                runtime_i=0
				
				result_path="${PATH_PREFIX}/${data_size}/${lang}/concurrency_${con}/iteration_${i}/${service}${lang}${PATH_SUFFIX}"
                
                if [ -d "$result_path" ]
                then 
                	cnt=$(($cnt+1))
                	
	                for run in $(seq 0 $runs)
	                do
	                    result_file=`ls $result_path | grep "run${run}.json"`
                        result_file="${result_path}/${result_file}"
	                    
                        result_json=`cat $result_file`
	                    newcontainer=`echo $result_json | jq '.newcontainer' | sed 's/\"//g'`
	                    
	                    if [ "$newcontainer" == "0" ]
	                    then
	                        runtime=`echo $result_json | jq '.runtime' | sed 's/\"//g'`
	                        runtime_i=$((${runtime_i}+${runtime}))
	                    fi
	                done
	            fi

                runtime_i=$((${runtime_i}/${con}))
                runtime_con=$((${runtime_con}+${runtime_i}))
            done    

            runtime_con=$((${runtime_con}/${cnt}))

            if [ "$con" -lt "$con_max" ]
            then
                runtime_row="${runtime_row}${runtime_con},"
            else
                runtime_row="${runtime_row}${runtime_con}"
            fi
        done

        echo $runtime_row >> $output_file 
    done
done

