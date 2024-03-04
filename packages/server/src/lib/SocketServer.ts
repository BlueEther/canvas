import http from "node:http";
import {
  ClientConfig,
  ClientToServerEvents,
  Pixel,
  ServerToClientEvents,
} from "@sc07-canvas/lib/src/net";
import { Server, Socket as RawSocket } from "socket.io";
import { session } from "./Express";
import Canvas from "./Canvas";
import { PalleteColor } from "@prisma/client";
import { prisma } from "./prisma";
import { Logger } from "./Logger";

/**
 * get socket.io server config, generated from environment vars
 */
const getSocketConfig = () => {
  // origins that should be permitted
  // origins need to be specifically defined if we want to allow CORS credential usage (cookies)
  const origins: string[] = [];

  if (process.env.CLIENT_ORIGIN) {
    origins.push(process.env.CLIENT_ORIGIN);
  }

  if (origins.length === 0) {
    return undefined;
  }

  return {
    cors: {
      origin: origins,
      credentials: true,
    },
  };
};

// this is terrible, another way to get the client config needs to be found
let PALLETE: PalleteColor[] = [];
const PIXEL_TIMEOUT_MS = 1000;

prisma.palleteColor
  .findMany()
  .then((palleteColors) => {
    PALLETE = palleteColors;
    Logger.info(`Loaded ${palleteColors.length} pallete colors`);
  })
  .catch((e) => {
    Logger.error("Failed to get pallete colors", e);
  });

const getClientConfig = (): ClientConfig => {
  return {
    pallete: {
      colors: PALLETE,
      pixel_cooldown: PIXEL_TIMEOUT_MS,
    },
    canvas: Canvas.getCanvasConfig(),
  };
};

type Socket = RawSocket<ClientToServerEvents, ServerToClientEvents>;

export class SocketServer {
  io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(server: http.Server) {
    this.io = new Server(server, getSocketConfig());

    this.setupOnlineTick();

    this.io.engine.use(session);
    this.io.on("connection", this.handleConnection.bind(this));
  }

  handleConnection(socket: Socket) {
    const clientConfig = getClientConfig();
    const user = this.getUserFromSocket(socket);
    Logger.debug("Socket connection " + (user ? "@" + user.sub : "No Auth"));

    if (socket.request.session.user) {
      // inform the client of their session if it exists
      socket.emit("user", socket.request.session.user);
    }

    socket.emit("config", getClientConfig());
    Canvas.getPixelsArray().then((pixels) => {
      socket.emit("canvas", pixels);
    });

    socket.on("place", async (pixel, ack) => {
      if (!user) {
        ack({ success: false, error: "no_user" });
        return;
      }

      const puser = await prisma.user.findFirst({ where: { sub: user.sub } });
      if (puser?.lastPixelTime) {
        if (
          puser.lastPixelTime.getTime() + clientConfig.pallete.pixel_cooldown >
          Date.now()
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
          id: pixel.color,
        },
      });
      if (!palleteColor) {
        ack({
          success: false,
          error: "pallete_color_invalid",
        });
        return;
      }

      await Canvas.setPixel(user, pixel.x, pixel.y, palleteColor.hex);

      const newPixel: Pixel = {
        x: pixel.x,
        y: pixel.y,
        color: pixel.color,
      };
      ack({
        success: true,
        data: newPixel,
      });
      socket.broadcast.emit("pixel", newPixel);
    });
  }

  getUserFromSocket(socket: Socket) {
    return socket.request.session.user
      ? {
          sub:
            socket.request.session.user.user.username +
            "@" +
            socket.request.session.user.service.instance.hostname,
          ...socket.request.session.user,
        }
      : undefined;
  }

  /**
   * setup the online people announcement
   *
   * this does work with multiple socket.io instances, so this needs to only be executed by one shard
   */
  setupOnlineTick() {
    setInterval(async () => {
      const sockets = await this.io.sockets.fetchSockets();
      for (const socket of sockets) {
        socket.emit("online", { count: sockets.length });
      }
    }, 5000);
  }
}
