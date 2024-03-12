#!/bin/bash

# builds client, admin & server into one folder
# - client is mounted at /
# - admin is mounted at /admin

# ensure we are in packages/build
MY_DIR="$(cd "$(dirname "$0")"; pwd)"
OUT_DIR="$(cd "$MY_DIR/../../build"; pwd)"
cd $MY_DIR

# empty out directory
rm -rf $OUT_DIR/*
mkdir -p $OUT_DIR/packages/lib
mkdir -p $OUT_DIR/packages/client
mkdir -p $OUT_DIR/packages/admin
mkdir -p $OUT_DIR/packages/server
mkdir -p $OUT_DIR/prisma

cp $MY_DIR/../../package.json $MY_DIR/../../package-lock.json $OUT_DIR/

LIB_DIR="$MY_DIR/../../packages/lib"
CLIENT_DIR="$MY_DIR/../../packages/client"
ADMIN_DIR="$MY_DIR/../../packages/admin"
SERVER_DIR="$MY_DIR/../../packages/server"
PRISMA_DIR="$SERVER_DIR/prisma"

cp -r $PRISMA_DIR/schema.prisma $PRISMA_DIR/migrations $OUT_DIR/prisma/

# --- Shared Library ---

echo "Building lib..."

cd "$MY_DIR/../.." && npm run-script build:lib
cd $LIB_DIR
mv dist $OUT_DIR/packages/lib
cp package.json $OUT_DIR/packages/lib/

# janky? fix to keep imports in dev
sed -i -e 's/"main": ".*"/"main": ".\/dist\/index.js"/' $OUT_DIR/packages/lib/package.json

# --- Main Client ---

echo "Building client..."

cd "$MY_DIR/../.." && npm run-script build:client
cd $CLIENT_DIR
mv dist/* $OUT_DIR/packages/client
rm -r dist # this dir is empty, delete it to prevent confusion

# --- Admin Client ---

echo "Building admin..."

cd "$MY_DIR/../../" && APP_ROOT=/admin npm run-script build:admin
cd $ADMIN_DIR
mv dist/* $OUT_DIR/packages/admin
rm -r dist # this dir is empty, delete it to prevent confusion

# --- Server ---

echo "Building server..."

cd "$MY_DIR/../../" && npm run-script build:server
cd $SERVER_DIR
mv dist $OUT_DIR/packages/server
cp package.json tool.sh $OUT_DIR/packages/server
# rm -r dist # this dir is empty, delete it to prevent confusion