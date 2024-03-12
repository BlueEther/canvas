#!/bin/sh
# ^ this needs to be SH instead of bash because of Alpine Linux

# Utility to use tool depending on environment (using built or dev tooling)

MY_DIR="$(cd "$(dirname "$0")"; pwd)"
cd $MY_DIR

USE_PROD=false
if [ "$NODE_ENV" = "production" ]; then
  USE_PROD=true
fi

if ! $USE_PROD; then
  echo "<!> Development environment detected";
  echo "<!> NODE_ENV is either empty or set to development";
  echo "<!> Set NODE_ENV to production to use production tools";
  echo "";
fi

DEV_TOOLS_ROOT=$MY_DIR/src/tools
PROD_TOOLS_ROOT=$MY_DIR/dist/tools

if [ "$1" = "" ]; then
  echo "Tool argument is empty, specify a filename (without extension) from tools directory";
  if $USE_PROD; then
    echo " > Tools Directory: $PROD_TOOLS_ROOT"
  else
    echo " > Tools Directory: $DEV_TOOLS_ROOT"
  fi
  exit 1
fi

if [[ "$1" == *"."* ]]; then
  echo "Tool argument contains a period, do not include extensions while executing tools"
  exit 1
fi

if $USE_PROD; then
  node $PROD_TOOLS_ROOT/$1.js
else
  npx ts-node --transpile-only $DEV_TOOLS_ROOT/$1.ts
fi