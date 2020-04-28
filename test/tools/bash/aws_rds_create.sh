#!/bin/bash
# AWS Lambda client creating RDS instances
# requires awscli
#
# script requires packages:
# apt install awscli

INSTANCES_NO=100
MIN_CAP=1
MAX_CAP=32
AUTO_PAUSE=300

VPC_SEC_GROUP_ID=sg-XXXXXXXX
MASTER_USERNAME=admin
MASTER_PASSWORD=password

while [ $INSTANCES_NO -gt 0 ]
do
	RESULT=$(aws rds create-db-cluster --db-cluster-identifier admin$INSTANCES_NO \
	--engine aurora --engine-version 5.6.10a --engine-mode serverless \
	--scaling-configuration MinCapacity=$MIN_CAP,MaxCapacity=$MAX_CAP,SecondsUntilAutoPause=$AUTO_PAUSE,AutoPause=true \
	--vpc-security-group-ids $VPC_SEC_GROUP_ID \
	--master-username $MASTER_USERNAME \
	--master-user-password $MASTER_PASSWORD 2>&1)
	INSTANCES_NO=$(($INSTANCES_NO - 1))
	sleep 5 # avoid network latency from AWS (similar to GCloud)
done
exit


