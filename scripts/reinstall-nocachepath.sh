#!/bin/bash
./scripts/clean.sh

echo Installing with no cache dir set, this should be blank: "$YARN_CACHE_FOLDER"
echo
echo .yarn size before:
du -sch .yarn
echo

echo running yarn
time yarn

echo
echo .yarn/* size after:
du -sch .yarn/*
echo node_modules size:
du -sch node_modules
