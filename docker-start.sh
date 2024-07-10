#!/bin/sh

# This script runs when the docker image starts
# It just forces all migrations to run and then starts lol

# Allow running of other scripts via environment variable (eg. profiler)
SCRIPT_TO_RUN="${SCRIPT_TO_RUN:-start}"

npx -w packages/server npx prisma migrate deploy
npm -w packages/server run $SCRIPT_TO_RUN