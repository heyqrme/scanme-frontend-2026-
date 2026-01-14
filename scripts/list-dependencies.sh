#!/bin/bash

cat package.json \
  | jq .dependencies \
  | sed "s/^{//g" \
  | sed "s/}$//g" \
  | sed -E "s/^ +\"/- /g" \
  | sed -E "s/\": \"/ /g" \
  | sed -E "s/\",{0,1}$//g"
