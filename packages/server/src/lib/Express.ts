import http from "node:http";
import path from "node:path";
import express, { type Express } from "express";
import expressSession from "express-session";
import RedisStore from "connect-redis";
import cors from "cors";
import { Redis } from "./redis";
import APIRoutes_client from "../api/client";
import APIRoutes_admin from "../api/admin";
import { Logger } from "./Logger";
import bodyParser from "body-parser";

export const session = expressSession({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({
    client: Redis.client,
    prefix: process.env.REDIS_SESSION_PREFIX || "canvas_session:",
  }),
  cookie: {
    httpOnly: false,
    ...(process.env.NODE_ENV === "development"
      ? { sameSite: "none" }
      : {
          secure: true,
        }),
  },
});

export class ExpressServer {
  app: Express;
  httpServer: http.Server;

  constructor() {
    this.app = express();

    if (process.env.NODE_ENV === "production") {
      this.app.set("trust proxy", 1);
    }

    this.httpServer = http.createServer(this.app);

    if (process.env.SERVE_CLIENT) {
      // client is needing to serve
      Logger.info(
        "Serving client UI at / using root " +
          path.join(__dirname, process.env.SERVE_CLIENT)
      );
      this.app.use(express.static(process.env.SERVE_CLIENT));
    } else {
      this.app.get("/", (req, res) => {
        res.status(404).contentType("html").send(`
          <html>
            <head>
              <title>Canvas Server</title>
            </head>
            <body>
              <h1>Canvas Server</h1>
              <p>This instance is not serving the client</p>
              <i>This instance might not be configured correctly</i>
            </body>
          </html>
        `);
      });
    }

    if (process.env.SERVE_ADMIN) {
      // client is needing to serve
      Logger.info(
        "Serving admin UI at /admin using root " +
          path.join(process.env.SERVE_ADMIN)
      );
      const assetsDir = path.join(process.env.SERVE_ADMIN, "assets");
      const indexFile = path.join(process.env.SERVE_ADMIN, "index.html");

      this.app.use("/admin/assets", express.static(assetsDir));
      this.app.use("/admin*", (req, res) => {
        res.sendFile(indexFile);
      });
    }

    if (process.env.NODE_ENV === "development") {
      this.app.use(
        cors({
          origin: [process.env.CLIENT_ORIGIN!, process.env.ADMIN_ORIGIN!],
          credentials: true,
        })
      );
    }

    this.app.use(session);
    this.app.use(bodyParser.json());
    this.app.use("/api", APIRoutes_client);
    this.app.use("/api/admin", APIRoutes_admin);

    this.httpServer.listen(parseInt(process.env.PORT), () => {
      Logger.info("Listening on :" + process.env.PORT);
    });
  }
}
