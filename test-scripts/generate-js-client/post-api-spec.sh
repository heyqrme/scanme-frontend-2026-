#!/bin/bash

# Make sure you run the UI server with `yarn dev` first
curl http://localhost:5173/api/new-openapi-spec \
  -d "@./test-scripts/generate-js-client/minimal-payload.json" \
  -H "Content-Type: application/json" \
  -v

