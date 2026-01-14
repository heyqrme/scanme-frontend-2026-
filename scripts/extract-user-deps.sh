#!/bin/bash
# Clear the temp dir every time
DEPS=temp_dependencies_data
rm -rf "$DEPS"
mkdir "$DEPS"

# Checkout the current tip of package.json
cp package.json "$DEPS"/package.json.precheckout
git checkout -- package.json

# Extract the user dependencies AKA whatever WE are not using
npx depcheck --json >"$DEPS"/legacy-user-deps.json
jq -r '(.devDependencies + .dependencies)[]' "$DEPS"/legacy-user-deps.json >"$DEPS"/legacy-user-deps.txt

# Remove the user dependencies
cp package.json "$DEPS"/package.json.preremoval
cat "$DEPS"/legacy-user-deps.txt | xargs yarn remove

# Add back some that gets removed but we need
yarn add --dev autoprefixer
cp package.json "$DEPS"/package.json.final
