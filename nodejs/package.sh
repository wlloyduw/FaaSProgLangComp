#!/usr/bin/env bash

echo "Deleting previous packages ..."
rm -f package.zip

echo "Creating temporary working directory ..."
wd=$(mktemp -d)

echo "Copying target files ..."
cp -r ./src "${wd}"
grep -v "aws-sdk" "./package.json" > "${wd}/package.json"

echo "Preparing target package ..."
pp=$(pwd)
cd "${wd}" || exit 1
npm install

echo "Creating archive ..."
zip -r package.zip ./*
mv package.zip "${pp}"
cd "${pp}" || exit 1
echo "Done."