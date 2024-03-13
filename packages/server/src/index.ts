// load declare module
import "./types";
import { Redis } from "./lib/redis";
import { Logger } from "./lib/Logger";
import { ExpressServer } from "./lib/Express";
import { SocketServer } from "./lib/SocketServer";

// Validate environment variables

if (!process.env.PORT || isNaN(parseInt(process.env.PORT))) {
  Logger.error("PORT env is not a valid number");
  process.exit(1);
}

if (
  !process.env.NODE_ENV ||
  ["development", "production"].indexOf(process.env.NODE_ENV) === -1
) {
  Logger.error("NODE_ENV is not valid [development, production]");
  process.exit(1);
}

if (!process.env.SESSION_SECRET) {
  Logger.error("SESSION_SECRET is not defined");
  process.exit(1);
}

if (!process.env.REDIS_HOST) {
  Logger.error("REDIS_HOST is not defined");
  process.exit(1);
}

if (!process.env.REDIS_SESSION_PREFIX) {
  Logger.info(
    "REDIS_SESSION_PREFIX was not defined, defaulting to canvas_session:"
  );
}

if (!process.env.AUTH_ENDPOINT) {
  Logger.error("AUTH_ENDPOINT is not defined");
  process.exit(1);
}

if (!process.env.AUTH_CLIENT) {
  Logger.error("AUTH_CLIENT is not defined");
  process.exit(1);
}

if (!process.env.AUTH_SECRET) {
  Logger.error("AUTH_SECRET is not defined");
  process.exit(1);
}

Redis.connect();

const express = new ExpressServer();
new SocketServer(express.httpServer);
