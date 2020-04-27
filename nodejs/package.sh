#!/usr/bin/env bash

echo "Deleting previous packages ..."
rm -f package.zip

echo "Creating temporary working directory ..."
wd=$(mktemp -d)

echo "Copying target files ..."
cp -r ./src "${wd}"
grep -v "aws-sdk" "./package.json" > "${wd}/package.json.tmp"
devDependenciesStart=$(grep -n devDependencies "${wd}/package.json.tmp" | cut -d':' -f 1)
devDependenciesCount=$(tail -n +"${devDependenciesStart}" "${wd}/package.json.tmp" | grep -n '}' | head -n 1 | cut -d':' -f 1)
devDependenciesCount=$(( devDependenciesCount + devDependenciesStart ))
devDependenciesStart=$(( devDependenciesStart - 1 ))
head -n +"${devDependenciesStart}" "${wd}/package.json.tmp" > "${wd}/package.json"
tail -n +"${devDependenciesCount}" "${wd}/package.json.tmp" >> "${wd}/package.json"
rm "${wd}/package.json.tmp"
cat "${wd}/package.json"
echo "Preparing target package ..."
pp=$(pwd)
cd "${wd}" || exit 1
npm install

echo "Creating archive ..."
zip -r package.zip ./*
mv package.zip "${pp}"
cd "${pp}" || exit 1
du -sh package.zip
echo "Done."