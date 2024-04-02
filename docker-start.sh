#!/bin/sh

# This script runs when the docker image starts
# It just forces all migrations to run and then starts lol

npx -w packages/server npx prisma migrate deploy
npm -w packages/server run start