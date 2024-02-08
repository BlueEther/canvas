import express from "express";
import expressSession from "express-session";
import http from "node:http";
import { Server } from "socket.io";
import {
  CPixelPacket,
  PacketAck,
  SCanvasPacket,
  SPixelPacket,
  SUserPacket,
} from "@sc07-canvas/lib/src/net";
import APIRoutes from "./api";

// load declare module
import "./types";
import { prisma } from "./lib/prisma";
import { PalleteColor, PrismaClient } from "@prisma/client";
import { getRedis, client as redisClient } from "./lib/redis";
import Canvas from "./lib/Canvas";
import RedisStore from "connect-redis";

if (!process.env.PORT || isNaN(parseInt(process.env.PORT))) {
  console.log("PORT env is not a valid number");
  process.exit(1);
}

getRedis().then(() => {
  console.log("redis connected");
});

const session = expressSession({
  secret: "jagoprhaupihuaciohruearp8349jud",
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({
    client: redisClient,
    prefix: "canvas_session:",
  }),
});
const app = express();
const server = http.createServer(app);
const io = new Server<
  {
    place: (
      data: CPixelPacket,
      callback: (data: PacketAck<SPixelPacket>) => {}
    ) => void;
  },
  {
    user: (user: SUserPacket) => void;
    config: (config: any) => void;
    pixel: (data: SPixelPacket) => void;
    canvas: (pixels: string[]) => void;
    online: (data: { count: number }) => void;
  }
>(server);

var PALLETE: PalleteColor[] = [];
const PIXEL_TIMEOUT_MS = 1000;

prisma.palleteColor
  .findMany()
  .then((palleteColors) => {
    PALLETE = palleteColors;
    console.log(`Loaded ${palleteColors.length} pallete colors`);
  })
  .catch(console.error);

// on startup, cache current top-level pixels on redis
// notify all other shards with pixel updates via redis

// cacheCanvasToRedis().then(() => {
//   console.log("canvas is now in redis");
// });

setInterval(async () => {
  const sockets = await io.sockets.fetchSockets();
  for (const socket of sockets) {
    socket.emit("online", { count: sockets.length });
  }
}, 5000);

io.engine.use(session);
io.on("connection", (socket) => {
  const user = socket.request.session.user
    ? {
        sub:
          socket.request.session.user.user.username +
          "@" +
          socket.request.session.user.service.instance.hostname,
        ...socket.request.session.user,
      }
    : undefined;
  console.log("connection", socket.request.session.user);

  if (socket.request.session.user)
    socket.emit("user", {
      type: "user",
      user: socket.request.session.user,
      _direction: "server->client",
    });

  socket.emit("config", {
    pallete: {
      colors: PALLETE,
      pixel_cooldown: PIXEL_TIMEOUT_MS,
    },
    canvas: Canvas.getCanvasConfig(),
  });

  Canvas.getPixelsArray().then((pixels) => {
    socket.emit("canvas", pixels);
  });

  socket.on(
    "place",
    async (
      { x, y, color }: CPixelPacket,
      ack: (data: PacketAck<SPixelPacket>) => {}
    ) => {
      if (!user) {
        ack({
          success: false,
          error: "no_user",
        });
        return;
      }

      const puser = await prisma.user.findFirst({ where: { sub: user.sub } });
      if (puser?.lastPixelTime) {
        if (
          puser.lastPixelTime.getTime() + PIXEL_TIMEOUT_MS >
          new Date().getTime()
        ) {
          ack({
            success: false,
            error: "pixel_cooldown",
          });
          return;
        }
      }

      const palleteColor = await prisma.palleteColor.findFirst({
        where: {
          id: color,
        },
      });

      if (!palleteColor) {
        ack({
          success: false,
          error: "pallete_color_invalid",
        });
        return;
      }

      await Canvas.setPixel(user, x, y, palleteColor.hex);

      ack({
        success: true,
        data: {
          type: "pixel",
          _direction: "server->client",
          x,
          y,
          color,
        },
      });
      socket.broadcast.emit("pixel", {
        x,
        y,
        color,
        type: "pixel",
        _direction: "server->client",
      });
    }
  );
});

app.use(session);
app.use(express.static("../client-next/public"));
app.use("/api", APIRoutes);

server.listen(parseInt(process.env.PORT!), () => {
  console.log("Listening on " + process.env.PORT);
});
