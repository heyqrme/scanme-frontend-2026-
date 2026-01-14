#!/bin/bash
export YARN_CACHE_FOLDER=/tmp/temp-devx-ui-yarn-cache
export DEVX_YARN_UNPLUGGED_FOLDER=/tmp/temp-devx-ui-yarn-unplugged

./scripts/clean.sh

mkdir -p "$DEVX_YARN_UNPLUGGED_FOLDER"
ln -s "$DEVX_YARN_UNPLUGGED_FOLDER" .yarn/unplugged

echo Installing with cache at "$YARN_CACHE_FOLDER" and unplugged at "$DEVX_YARN_UNPLUGGED_FOLDER"
echo
echo .yarn size before:
du -sch .yarn
echo

echo running yarn
time yarn

echo
echo .yarn size after:
du -sch .yarn
echo yarn cache size:
du -sch "$YARN_CACHE_FOLDER"
echo node_modules size:
du -sch node_modules
echo unplugged size:
du -sch "$DEVX_YARN_UNPLUGGED_FOLDER"
