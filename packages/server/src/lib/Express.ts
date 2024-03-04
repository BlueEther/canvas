import http from "node:http";
import express, { type Express } from "express";
import expressSession from "express-session";
import RedisStore from "connect-redis";
import { Redis } from "./redis";
import APIRoutes from "../api";
import { Logger } from "./Logger";

export const session = expressSession({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({
    client: Redis.client,
    prefix: process.env.REDIS_SESSION_PREFIX || "canvas_session:",
  }),
  cookie: {
    sameSite: "none",
    httpOnly: false,
  },
});

export class ExpressServer {
  app: Express;
  httpServer: http.Server;

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);

    this.app.use(session);
    this.app.use("/api", APIRoutes);

    this.httpServer.listen(parseInt(process.env.PORT), () => {
      Logger.info("Listening on :" + process.env.PORT);
    });
  }
}
