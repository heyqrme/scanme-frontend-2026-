#!/bin/bash
export YARN_CACHE_FOLDER=${YARN_CACHE_FOLDER:-$HOME/temp-devx-ui-yarn-cache}
export DEVX_YARN_UNPLUGGED_FOLDER=${DEVX_YARN_UNPLUGGED_FOLDER:-$HOME/temp-devx-ui-yarn-unplugged}

echo Deleting local install files
echo .yarn/install-state.gz .yarn/unplugged .yarn/cache .pnp.cjs .pnp.loader.mjs node_modules
rm -rf .yarn/install-state.gz .yarn/unplugged .yarn/cache .pnp.cjs .pnp.loader.mjs node_modules

if [[ $YARN_CACHE_FOLDER != "" ]]; then
  if [[ $YARN_CACHE_FOLDER =~ temp ]]; then
    echo Deleting cache at "$YARN_CACHE_FOLDER"
    rm -rf "$YARN_CACHE_FOLDER"
  else
    echo "Warning: YARN_CACHE_FOLDER does not contain 'temp'. Skipping deletion for safety."
  fi
fi

if [[ $DEVX_YARN_UNPLUGGED_FOLDER != "" ]]; then
  if [[ $DEVX_YARN_UNPLUGGED_FOLDER =~ temp ]]; then
    echo Deleting unplugged dir at "$DEVX_YARN_UNPLUGGED_FOLDER"
    rm -rf "$DEVX_YARN_UNPLUGGED_FOLDER"
  else
    echo "Warning: DEVX_YARN_UNPLUGGED_FOLDER does not contain 'temp'. Skipping deletion for safety."
  fi
fi

echo To use this cache set this before yarn:
echo "export YARN_CACHE_FOLDER=$YARN_CACHE_FOLDER"
