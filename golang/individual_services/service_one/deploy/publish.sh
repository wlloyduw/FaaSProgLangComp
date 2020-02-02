#!/bin/bash

# Mutli-platform Publisher. Used to publish FaaS Inspector Go functions onto AWS Lambda
#
# Each platform's default function is defined in the platforms folder. These are copied into the source folder
# and deployed onto each platform accordingly. Developers should write their function in the function.js file. 
# All source files should be in the src folder and dependencies defined in package.json. 
#
# This script requires each platform's CLI to be installed and properly configured to update functions.
# AWS CLI: apt install awscli 
# Google Cloud CLI: https://cloud.google.com/sdk/docs/quickstarts
# IBM Cloud CLI: https://www.ibm.com/cloud/cli
# Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest
#
# Choose which platforms to deploy to using command line arguments:
# ./publish.sh AWS GCF IBM AZURE MEMORY
# Example to deploy to AWS and Azure: ./publish.sh 1 0 0 1 1024
#
# Get the function name from the config.json file.

cd "$(dirname "$0")"

function=`cat ./config.json | jq '.functionName' | tr -d '"'`
lambdaHandler=`cat ./config.json | jq '.lambdaHandler' | tr -d '"'`
lambdaRole=`cat ./config.json | jq '.lambdaRoleARN' | tr -d '"'`
lambdaSubnets=`cat ./config.json | jq '.lambdaSubnets' | tr -d '"'`
lambdaSecurityGroups=`cat ./config.json | jq '.lambdaSecurityGroups' | tr -d '"'`

json=`cat config.json | jq -c '.test'`

memory=`cat ./config.json | jq '.memorySetting' | tr -d '"'`

echo
echo "----- Deploying $function onto AWS Lambda -----"
echo

# build binary and zip it up
cd ../lambda
GOOS=linux go build -o ../target/main 
cd ../target
zip function.zip main

echo
echo "----- Creating Function $function ------"
echo
# aws lambda create-function --function-name $function --runtime go1.x --zip-file fileb://function.zip --handler $lambdaHandler --role $lambdaRole --timeout 900

echo
echo "----- Updating Function $function Code ------"
echo
aws lambda update-function-code --function-name $function --zip-file fileb://function.zip

echo
echo "----- Updating Function $function Configuration ------"
echo
# aws lambda update-function-configuration --function-name $function --memory-size $memory --runtime go1.x --vpc-config SubnetIds=[$lambdaSubnets],SecurityGroupIds=[$lambdaSecurityGroups]

echo
echo Testing $function on AWS Lambda...
aws lambda invoke --invocation-type RequestResponse --cli-read-timeout 900 --function-name $function --payload $json /dev/stdout
