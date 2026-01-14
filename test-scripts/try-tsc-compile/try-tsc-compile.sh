#!/bin/bash

echo Make sure you run the UI server with 'yarn dev' first.

echo
echo Example 1
curl http://127.0.0.1:5173/api/tsc-diagnostics \
    -d "@./test-scripts/try-tsc-compile/example-payload-1.json" \
    -H "Content-Type: application/json" \
    -v

echo
echo Example 2
curl http://127.0.0.1:5173/api/tsc-diagnostics \
    -d "@./test-scripts/try-tsc-compile/example-payload-2.json" \
    -H "Content-Type: application/json" \
    -v
