#!/bin/bash
# AWS Lambda client deleting RDS instances
# requires awscli
#
# script requires packages:
# apt install awscli

INSTANCES_NO=50
MIN_CAP=1
MAX_CAP=32
AUTO_PAUSE=300

VPC_SEC_GROUP_ID=sg-XXXXXXXX
MASTER_USERNAME=admin
MASTER_PASSWORD=password

while [ $INSTANCES_NO -gt 0 ]
do
	RESULT=$(aws rds delete-db-cluster --db-cluster-identifier admin$INSTANCES_NO --skip-final-snapshot 2>&1)
	INSTANCES_NO=$(($INSTANCES_NO - 1))
	sleep 5 # avoid network latency from AWS (similar to GCloud)
done
exit


