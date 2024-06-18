import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { Redis } from "./redis";

const REDIS_PREFIX = process.env.REDIS_RATELIMIT_PREFIX || "canavs_ratelimit:";

export const RateLimiter = {
  ADMIN: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,

    skipSuccessfulRequests: true,

    store: new RedisStore({
      prefix: REDIS_PREFIX + "admin:",
      sendCommand: async (...args: string[]) => {
        const client = await Redis.getClient();

        return await client.sendCommand(args);
      },
    }),
  }),
  HIGH: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      prefix: REDIS_PREFIX + "high:",
      sendCommand: async (...args: string[]) => {
        const client = await Redis.getClient();

        return await client.sendCommand(args);
      },
    }),
  }),
};
