#!/bin/bash
# This is run from devx-base.Dockerfile.
# These files shouldn't be there in dockerfile, also shouldn't be commited
rm -rf node_modules .yarn/unplugged .yarn/cache .yarn/install-state.gz .pnp.cjs .pnp.loader.mjs
