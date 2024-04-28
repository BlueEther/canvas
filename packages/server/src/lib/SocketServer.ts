import http from "node:http";
import {
  ClientConfig,
  ClientToServerEvents,
  Pixel,
  ServerToClientEvents,
} from "@sc07-canvas/lib/src/net";
import { CanvasLib } from "@sc07-canvas/lib";
import { Server, Socket as RawSocket } from "socket.io";
import { session } from "./Express";
import Canvas from "./Canvas";
import { PaletteColor } from "@prisma/client";
import { prisma } from "./prisma";
import { Logger } from "./Logger";
import { Redis } from "./redis";
import { User } from "../models/User";

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
let PALLETE: PaletteColor[] = [];
const PIXEL_TIMEOUT_MS = 1000;

prisma.paletteColor
  .findMany()
  .then((paletteColors) => {
    PALLETE = paletteColors;
    Logger.info(`Loaded ${paletteColors.length} pallete colors`);
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
  static instance: SocketServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(server: http.Server) {
    SocketServer.instance = this;

    this.io = new Server(server, getSocketConfig());

    this.setupMasterShard();

    this.io.engine.use(session);
    this.io.on("connection", this.handleConnection.bind(this));

    // pixel stacking
    // - needs to be exponential (takes longer to aquire more pixels stacked)
    // - convert to config options instead of hard-coded
    setInterval(async () => {
      const DEBUG = false;

      if (DEBUG) Logger.debug("Running pixel stacking...");
      const redis = await Redis.getClient();
      const sockets = await this.io.local.fetchSockets();

      for (const socket of sockets) {
        const sub = await redis.get(Redis.key("socketToSub", socket.id));
        if (!sub) {
          if (DEBUG) Logger.warn(`Socket ${socket.id} has no user`);
          continue;
        }

        const user = await User.fromSub(sub);
        if (!user) {
          if (DEBUG)
            Logger.warn(
              `Socket ${socket.id}'s user (${sub}) does not exist in the database`
            );
          continue;
        }

        // time in seconds since last pixel placement
        // TODO: this causes a mismatch between placement times
        //       - going from 0 stack to 6 stack has a steady increase between each
        //       - going from 3 stack to 6 stack takes longer
        const timeSinceLastPlace =
          (Date.now() - user.lastPixelTime.getTime()) / 1000;
        const cooldown = CanvasLib.getPixelCooldown(
          user.pixelStack + 1,
          getClientConfig()
        );

        // this impl has the side affect of giving previously offline users all the stack upon reconnecting
        if (
          timeSinceLastPlace >= cooldown &&
          user.pixelStack < getClientConfig().canvas.pixel.maxStack
        ) {
          await user.modifyStack(1);

          if (DEBUG)
            Logger.debug(sub + " has gained another pixel in their stack");
        }
      }
    }, 1000);
  }

  async handleConnection(socket: Socket) {
    const user =
      socket.request.session.user &&
      (await User.fromAuthSession(socket.request.session.user));
    Logger.debug(
      `Socket ${socket.id} connection ` + (user ? "@" + user.sub : "No Auth")
    );

    user?.sockets.add(socket);
    Logger.debug("handleConnection " + user?.sockets.size);

    Redis.getClient().then((redis) => {
      if (user) redis.set(Redis.key("socketToSub", socket.id), user.sub);
    });

    if (socket.request.session.user) {
      // inform the client of their session if it exists
      socket.emit("user", socket.request.session.user);
    }

    if (user) {
      socket.emit("availablePixels", user.pixelStack);
      socket.emit("pixelLastPlaced", user.lastPixelTime.getTime());
    }

    socket.emit("config", getClientConfig());
    Canvas.getPixelsArray().then((pixels) => {
      socket.emit("canvas", pixels);
    });

    socket.on("disconnect", () => {
      Logger.debug(`Socket ${socket.id} disconnected`);

      user?.sockets.delete(socket);

      Redis.getClient().then((redis) => {
        if (user) redis.del(Redis.key("socketToSub", socket.id));
      });
    });

    socket.on("place", async (pixel, ack) => {
      if (!user) {
        ack({ success: false, error: "no_user" });
        return;
      }

      if (
        pixel.x < 0 ||
        pixel.y < 0 ||
        pixel.x >= getClientConfig().canvas.size[0] ||
        pixel.y >= getClientConfig().canvas.size[1]
      ) {
        ack({ success: false, error: "invalid_pixel" });
        return;
      }

      // force a user data update
      await user.update(true);

      if (user.pixelStack < 1) {
        ack({ success: false, error: "pixel_cooldown" });
        return;
      }

      const paletteColor = await prisma.paletteColor.findFirst({
        where: {
          id: pixel.color,
        },
      });
      if (!paletteColor) {
        ack({
          success: false,
          error: "palette_color_invalid",
        });
        return;
      }

      await user.modifyStack(-1);
      await Canvas.setPixel(user, pixel.x, pixel.y, paletteColor.hex);
      // give undo capabilities
      await user.setUndo(
        new Date(Date.now() + Canvas.getCanvasConfig().undo.grace_period)
      );

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

    socket.on("undo", async (ack) => {
      if (!user) {
        ack({ success: false, error: "no_user" });
        return;
      }

      await user.update(true);

      if (!user.undoExpires) {
        // user has no undo available
        ack({ success: false, error: "unavailable" });
        return;
      }

      const isExpired = user.undoExpires.getTime() - Date.now() < 0;

      if (isExpired) {
        // expiration date is in the past, so no undo is available
        ack({ success: false, error: "unavailable" });
        return;
      }

      // find most recent pixel
      const pixel = await prisma.pixel.findFirst({
        where: { userId: user.sub },
        orderBy: { createdAt: "desc" },
      });

      if (!pixel) {
        // user doesn't have a pixel, idk how we got here, but they can't do anything
        ack({ success: false, error: "unavailable" });
        return;
      }

      // mark the undo as used
      await user.setUndo();

      // delete most recent pixel
      await prisma.pixel.delete({ where: { id: pixel.id } });

      // trigger re-cache on redis
      await Canvas.refreshPixel(pixel.x, pixel.y);

      ack({ success: true, data: {} });
    });
  }

  /**
   * Master Shard (need better name)
   * This shard should be in charge of all user management, allowing for syncronized events
   *
   * Events:
   * - online people announcement
   *
   * this does work with multiple socket.io instances, so this needs to only be executed by one shard
   */
  setupMasterShard() {
    // online announcement event
    setInterval(async () => {
      // possible issue: this includes every connected socket, not user count
      const sockets = await this.io.sockets.fetchSockets();
      for (const socket of sockets) {
        socket.emit("online", { count: sockets.length });
      }
    }, 5000);
  }
}
