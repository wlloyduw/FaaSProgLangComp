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
        cpuUsr_row="cpuUsr,"
        cpuNice_row="cpuNice,"
        cpuKrn_row="cpuKrn,"
        cpuIdle_row="cpuIdle,"
        cpuIowait_row="cpuIowait,"
        cpuIrq_row="cpuIrq,"
        cpuSoftIrq_row="cpuSoftIrq,"
        vmcpusteal_row="vmcpusteal,"

        for con in $cons
        do
            runtime_con=0
            cpuUsr_con=0
            cpuNice_con=0
            cpuKrn_con=0
            cpuIdle_con=0
            cpuIowait_con=0
            cpuIrq_con=0
            cpuSoftIrq_con=0
            vmcpusteal_con=0

			cnt=0

            for i in $(seq 2 $iter)
            do
                echo "------------- Analyzing iteration $i, concurrency $con, $service, $lang results --------------"

                runs=$(($con-1))
                cnt=0

                runtime_i=0
                cpuUsr_i=0
                cpuNice_i=0
                cpuKrn_i=0
                cpuIdle_i=0
                cpuIowait_i=0
                cpuIrq_i=0
                cpuSoftIrq_i=0
                vmcpusteal_i=0
				
				result_path="${PATH_PREFIX}/${data_size}/${lang}/concurrency_${con}/iteration_${i}/${service}${lang}${PATH_SUFFIX}"
                if [ -d "$result_path" ]
                then 
                	cnt=$(($cnt+1))
                	
	                for run in $(seq 0 $runs)
	                do
	                    result_file=`ls $result_path | grep "run${run}"`
	                    result_file="${result_path}/${result_file}"
	                    
	                    result_json=`cat $result_file`
	                    newcontainer=`echo $result_json | jq '.newcontainer' | sed 's/\"//g'`
	                    
	                    if [ "$newcontainer" == "0" ]
	                    then
	                        runtime=`echo $result_json | jq '.runtime' | sed 's/\"//g'`
	                        cpuUsr=`echo $result_json | jq '.cpuUsr' | sed 's/\"//g'`
	                        cpuNice=`echo $result_json | jq '.cpuNice' | sed 's/\"//g'`
	                        cpuKrn=`echo $result_json | jq '.cpuKrn' | sed 's/\"//g'`
	                        cpuIdle=`echo $result_json | jq '.cpuIdle' | sed 's/\"//g'`
	                        cpuIowait=`echo $result_json | jq '.cpuIowait' | sed 's/\"//g'`
	                        cpuIrq=`echo $result_json | jq '.cpuIrq' | sed 's/\"//g'`
	                        cpuSoftIrq=`echo $result_json | jq '.cpuSoftIrq' | sed 's/\"//g'`
	                        vmcpusteal=`echo $result_json | jq '.vmcpusteal' | sed 's/\"//g'`
	
	                        runtime_i=$((${runtime_i}+${runtime}))
	                        cpuUsr_i=$((${cpuUsr_i}+${cpuUsr}))
	                        cpuNice_i=$((${cpuNice_i}+${cpuNice}))
	                        cpuKrn_i=$((${cpuKrn_i}+${cpuKrn}))
	                        cpuIdle_i=$((${cpuIdle_i}+${cpuIdle}))
	                        cpuIowait_i=$((${cpuIowait_i}+${cpuIowait}))
	                        cpuIrq_i=$((${cpuIrq_i}+${cpuIrq}))
	                        cpuSoftIrq_i=$((${cpuSoftIrq_i}+${cpuSoftIrq}))
	                        vmcpusteal_i=$((${vmcpusteal_i}+${vmcpusteal}))
	                        
	                        cnt=$(($cnt+1))
	                    fi
	                done
	            fi

                runtime_i=$((${runtime_i}/${con}))
                cpuUsr_i=$((${cpuUsr_i}/${con}))
                cpuNice_i=$((${cpuNice_i}/${con}))
                cpuKrn_i=$((${cpuKrn_i}/${con}))
                cpuIdle_i=$((${cpuIdle_i}/${con}))
                cpuIowait_i=$((${cpuIowait_i}/${con}))
                cpuIrq_i=$((${cpuIrq_i}/${con}))
                cpuSoftIrq_i=$((${cpuSoftIrq_i}/${con}))
                vmcpusteal_i=$((${vmcpusteal_i}/${con}))

                runtime_con=$((${runtime_con}+${runtime_i}))
                cpuUsr_con=$((${cpuUsr_con}+${cpuUsr_i}))
                cpuNice_con=$((${cpuNice_con}+${cpuNice_i}))
                cpuKrn_con=$((${cpuKrn_con}+${cpuKrn_i}))
                cpuIdle_con=$((${cpuIdle_con}+${cpuIdle_i}))
                cpuIowait_con=$((${cpuIowait_con}+${cpuIowait_i}))
                cpuIrq_con=$((${cpuIrq_con}+${cpuIrq_i}))
                cpuSoftIrq_con=$((${cpuSoftIrq_con}+${cpuSoftIrq_i}))
                vmcpusteal_con=$((${vmcpusteal_con}+${vmcpusteal_i}))

            done    

            runtime_con=$((${runtime_con}/${cnt}))
            cpuUsr_con=$((${cpuUsr_con}/${cnt}))
            cpuNice_con=$((${cpuNice_con}/${cnt}))
            cpuKrn_con=$((${cpuKrn_con}/${cnt}))
            cpuIdle_con=$((${cpuIdle_con}/${cnt}))
            cpuIowait_con=$((${cpuIowait_con}/${cnt}))
            cpuIrq_con=$((${cpuIrq_con}/${cnt}))
            cpuSoftIrq_con=$((${cpuSoftIrq_con}/${cnt}))
            vmcpusteal_con=$((${vmcpusteal_con}/${cnt}))

            if [ "$con" -lt "$con_max" ]
            then
                runtime_row="${runtime_row}${runtime_con},"
                cpuUsr_row="${cpuUsr_row}${cpuUsr_con},"
                cpuNice_row="${cpuNice_row}${cpuNice_con},"
                cpuKrn_row="${cpuKrn_row}${cpuKrn_con},"
                cpuIdle_row="${cpuIdle_row}${cpuIdle_con},"
                cpuIowait_row="${cpuIowait_row}${cpuIowait_con},"
                cpuIrq_row="${cpuIrq_row}${cpuIrq_con},"
                cpuSoftIrq_row="${cpuSoftIrq_row}${cpuSoftIrq_con},"
                vmcpusteal_row="${vmcpusteal_row}${vmcpusteal_con},"
            else
                runtime_row="${runtime_row}${runtime_con}"
                cpuUsr_row="${cpuUsr_row}${cpuUsr_con}"
                cpuNice_row="${cpuNice_row}${cpuNice_con}"
                cpuKrn_row="${cpuKrn_row}${cpuKrn_con}"
                cpuIdle_row="${cpuIdle_row}${cpuIdle_con}"
                cpuIowait_row="${cpuIowait_row}${cpuIowait_con}"
                cpuIrq_row="${cpuIrq_row}${cpuIrq_con}"
                cpuSoftIrq_row="${cpuSoftIrq_row}${cpuSoftIrq_con}"
                vmcpusteal_row="${vmcpusteal_row}${vmcpusteal_con}"
            fi
        done

        echo $runtime_row >> $output_file 
        echo $cpuUsr_row >> $output_file
        echo $cpuNice_row >> $output_file
        echo $cpuKrn_row >> $output_file
        echo $cpuIdle_row >> $output_file
        echo $cpuIowait_row >> $output_file
        echo $cpuIrq_row >> $output_file
        echo $cpuSoftIrq_row >> $output_file
        echo $vmcpusteal_row >> $output_file
    done
done

