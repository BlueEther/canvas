import http from "node:http";
import path from "node:path";
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
          path.join(__dirname, process.env.SERVE_ADMIN)
      );
      const assetsDir = path.join(__dirname, process.env.SERVE_ADMIN, "assets");
      const indexFile = path.join(
        __dirname,
        process.env.SERVE_ADMIN,
        "index.html"
      );

      this.app.use("/admin/assets", express.static(assetsDir));
      this.app.use("/admin/*", (req, res) => {
        res.sendFile(indexFile);
      });
    }

    this.app.use(session);
    this.app.use("/api", APIRoutes);

    this.httpServer.listen(parseInt(process.env.PORT), () => {
      Logger.info("Listening on :" + process.env.PORT);
    });
  }
}
