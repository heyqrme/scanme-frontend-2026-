#!/usr/bin/env bash

PATCH_PATH=$(yarn patch @stackframe/react --json | jq -r .path)
cp -r ~/dev/databutton/stack-auth/packages/react/dist/* "$PATCH_PATH/dist/"
yarn patch-commit -s "$PATCH_PATH"
yarn install
