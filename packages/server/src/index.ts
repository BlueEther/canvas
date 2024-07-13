// load declare module
import "./types";
import { Redis } from "./lib/redis";
import { getLogger } from "./lib/Logger";
import { ExpressServer } from "./lib/Express";
import { SocketServer } from "./lib/SocketServer";
import { OpenID } from "./lib/oidc";
import { loadSettings } from "./lib/Settings";
import "./workers/worker";
import { spawnCacheWorkers } from "./workers/worker";

const Logger = getLogger("MAIN");

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

if (!process.env.NODE_APP_INSTANCE) {
  Logger.warn(
    "NODE_APP_INSTANCE is not defined, metrics will not include process label"
  );
}

if (!process.env.PROMETHEUS_TOKEN) {
  Logger.warn(
    "PROMETHEUS_TOKEN is not defined, /metrics will not be accessable"
  );
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

if (!process.env.REDIS_RATELIMIT_PREFIX) {
  Logger.info(
    "REDIS_RATELIMIT_PREFIX was not defined, defaulting to canvas_ratelimit:"
  );
}

if (!process.env.INHIBIT_LOGIN) {
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

  if (!process.env.OIDC_CALLBACK_HOST) {
    Logger.error("OIDC_CALLBACK_HOST is not defined");
    process.exit(1);
  }
}

if (!process.env.PIXEL_LOG_PATH) {
  Logger.warn("PIXEL_LOG_PATH is not defined, defaulting to packages/server");
}

if (!process.env.CACHE_WORKERS) {
  Logger.warn("CACHE_WORKERS is not defined, defaulting to 1 worker");
}

// run startup tasks, all of these need to be completed to serve
Promise.all([
  Redis.getClient(),
  OpenID.setup().then(() => {
    Logger.info("Setup OpenID");
  }),
  spawnCacheWorkers(),
  loadSettings(),
]).then(() => {
  Logger.info("Startup tasks have completed, starting server");
  Logger.warn("Make sure the jobs process is running");

  const express = new ExpressServer();
  new SocketServer(express.httpServer);
});
