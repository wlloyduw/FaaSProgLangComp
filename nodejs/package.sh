#!/usr/bin/env bash

echo "Deleting previous packages ..."
rm -f package.zip

echo "Creating temporary working directory ..."
wd=$(mktemp -d)

echo "Copying target files ..."
cp -r src/* "${wd}"

pp=$(pwd)
cd "${wd}" || exit 1

echo "Creating archive ..."
zip -r pacakge.zip ./*
mv pacakge.zip "${pp}"
cd "${pp}" || exit 1
echo "Done."