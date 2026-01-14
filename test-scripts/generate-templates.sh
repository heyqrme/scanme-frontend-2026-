#!/bin/bash

# Generate the files in the templates folder matching the config we use
npx swagger-typescript-api \
    generate-templates \
    --extract-request-params \
    --extract-request-body \
    --extract-response-body \
    --extract-response-error \
    -o templates \
    -m \
    --http-client fetch

