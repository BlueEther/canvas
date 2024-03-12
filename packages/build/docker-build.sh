#!/bin/bash

MY_DIR="$(cd "$(dirname "$0")"; pwd)"
OUT_DIR="$(cd "$MY_DIR/../../build"; pwd)"
cd $MY_DIR

cp Dockerfile $OUT_DIR/
cd $OUT_DIR

docker build . -t sc07/canvas