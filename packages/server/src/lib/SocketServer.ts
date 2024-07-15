import http from "node:http";
import * as child from "node:child_process";
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
import { getLogger } from "./Logger";
import { Redis } from "./redis";
import { User } from "../models/User";
import { Recaptcha } from "./Recaptcha";

const Logger = getLogger("SOCKET");

// maybe move to a constants file?
const commitHash = child
  .execSync("git rev-parse --short HEAD")
  .toString()
  .trim();

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

export const getClientConfig = (): ClientConfig => {
  return {
    version: commitHash,
    pallete: {
      colors: PALLETE,
      pixel_cooldown: PIXEL_TIMEOUT_MS,
    },
    canvas: Canvas.getCanvasConfig(),
    chat: {
      enabled: true,
      matrix_homeserver: process.env.MATRIX_HOMESERVER,
      element_host: process.env.ELEMENT_HOST,
      general_alias: process.env.MATRIX_GENERAL_ALIAS,
    },
  };
};

type Socket = RawSocket<ClientToServerEvents, ServerToClientEvents>;

export class SocketServer {
  static instance: SocketServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  /**
   * Prevent users from time attacking pixel placements to place more pixels than stacked
   *
   * @key user sub (grant@grants.cafe)
   * @value timestamp
   */
  userPlaceLock = new Map<string, number>();

  constructor(server: http.Server) {
    SocketServer.instance = this;

    this.io = new Server(server, getSocketConfig());

    this.setupMasterShard();

    this.io.engine.use(session);
    this.io.on("connection", this.handleConnection.bind(this));

    // clear pixel locks if they have existed for more than a minute
    setInterval(() => {
      const oneMinuteAgo = new Date();
      oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1);

      const expired = [...this.userPlaceLock.entries()].filter(
        ([user, time]) => time < oneMinuteAgo.getTime()
      );

      if (expired.length > 0) {
        Logger.warn(
          "A pixel lock has existed for too long for " +
            expired.length +
            " users : " +
            expired.map((a) => a[0]).join(",")
        );
      }

      for (const expire of expired) {
        this.userPlaceLock.delete(expire[0]);
      }
    }, 1000 * 30);

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

        // time in seconds since last stack gain (including a potential bonus depending on previously remaining time)
        const timeSinceLastPlace =
          (Date.now() - user.lastTimeGainStarted.getTime()) / 1000;
        const cooldown = CanvasLib.getPixelCooldown(
          user.pixelStack + 1,
          getClientConfig()
        );

        await user.update(true);

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

  /**
   * Broadcast config to all connected clients
   *
   * Used by canvas size updates
   */
  broadcastConfig() {
    this.io.emit("config", getClientConfig());
  }

  async handleConnection(socket: Socket) {
    const user =
      socket.request.session.user &&
      (await User.fromAuthSession(socket.request.session.user));
    Logger.debug(
      `Socket ${socket.id} connection ` + (user ? "@" + user.sub : "No Auth")
    );

    user?.sockets.add(socket);

    let ip = socket.handshake.address;
    if (process.env.NODE_ENV === "production") {
      if (typeof socket.handshake.headers["x-forwarded-for"] === "string") {
        ip = socket.handshake.headers["x-forwarded-for"];
      } else {
        ip = socket.handshake.headers["x-forwarded-for"]?.[0] || ip;
      }
    }
    user?.trackIP(ip);

    Logger.debug("handleConnection " + user?.sockets.size);
    socket.emit("clearCanvasChunks");

    Redis.getClient().then((redis) => {
      if (user) redis.set(Redis.key("socketToSub", socket.id), user.sub);
    });

    if (socket.request.session.user) {
      // inform the client of their session if it exists
      socket.emit("user", socket.request.session.user);
    }

    if (user) {
      socket.emit("availablePixels", user.pixelStack);
      socket.emit("pixelLastPlaced", user.lastTimeGainStarted.getTime());

      const ban = user.getBan();
      socket.emit(
        "standing",
        ban
          ? {
              banned: true,
              until: ban.expires.toISOString(),
              reason: ban.publicNote || undefined,
            }
          : { banned: false }
      );
    }

    if (process.env.RECAPTCHA_SITE_KEY)
      socket.emit("recaptcha", process.env.RECAPTCHA_SITE_KEY);

    socket.emit("config", getClientConfig());
    {
      Canvas.sendCanvasChunksToSocket(socket).then(() => {
        socket.emit("alert", {
          is: "toast",
          action: "system",
          severity: "success",
          title: "Canvas loaded",
          autoDismiss: true,
        });
      });
    }

    socket.on("disconnect", () => {
      Logger.debug(`Socket ${socket.id} disconnected`);

      user?.sockets.delete(socket);

      Redis.getClient().then((redis) => {
        if (user) redis.del(Redis.key("socketToSub", socket.id));
      });
    });

    socket.on("place", async (pixel, bypassCooldown, ack) => {
      if (getClientConfig().canvas.frozen) {
        ack({ success: false, error: "canvas_frozen" });
        return;
      }

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

      if (this.userPlaceLock.has(user.sub)) {
        ack({ success: false, error: "pixel_already_pending" });
        return;
      }

      this.userPlaceLock.set(user.sub, Date.now());

      if (bypassCooldown && !user.isModerator) {
        // only moderators can do this
        ack({ success: false, error: "invalid_pixel" });
        this.userPlaceLock.delete(user.sub);
        return;
      }

      if (!bypassCooldown && user.pixelStack < 1) {
        ack({ success: false, error: "pixel_cooldown" });
        this.userPlaceLock.delete(user.sub);
        return;
      }

      if ((user.getBan()?.expires || 0) > new Date()) {
        ack({ success: false, error: "banned" });
        this.userPlaceLock.delete(user.sub);
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
        this.userPlaceLock.delete(user.sub);
        return;
      }

      const pixelAtTheSameLocation = await Canvas.getPixel(pixel.x, pixel.y);

      if (
        pixelAtTheSameLocation &&
        pixelAtTheSameLocation.userId === user.sub &&
        pixelAtTheSameLocation.color === paletteColor.hex
      ) {
        ack({ success: false, error: "you_already_placed_that" });
        this.userPlaceLock.delete(user.sub);
        return;
      }

      Recaptcha.maybeChallenge(socket);

      await user.modifyStack(-1);
      await Canvas.setPixel(
        user,
        pixel.x,
        pixel.y,
        paletteColor.hex,
        bypassCooldown
      );
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
      this.userPlaceLock.delete(user.sub);
    });

    socket.on("undo", async (ack) => {
      if (getClientConfig().canvas.frozen) {
        ack({ success: false, error: "canvas_frozen" });
        return;
      }

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

      // delete most recent pixel
      try {
        await Canvas.undoPixel(pixel);
      } catch (e) {
        ack({ success: false, error: "pixel_covered" });
        return;
      }

      // mark the undo as used
      await user.setUndo();

      // give user pixel back
      await user.modifyStack(1);

      // trigger re-cache on redis
      await Canvas.refreshPixel(pixel.x, pixel.y);

      ack({ success: true, data: {} });
    });

    socket.on("subscribe", (topic) => {
      socket.join("sub:" + topic);
    });

    socket.on("unsubscribe", (topic) => {
      socket.leave("sub:" + topic);
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
  async setupMasterShard() {
    // online announcement event
    setInterval(async () => {
      // possible issue: this includes every connected socket, not user count
      const sockets = await this.io.sockets.fetchSockets();
      for (const socket of sockets) {
        socket.emit("online", { count: sockets.length });
      }
    }, 5000);

    const redis = await Redis.getClient("SUB");
    redis.subscribe(Redis.key("channel_heatmap"), (message, channel) => {
      this.io.to("sub:heatmap").emit("heatmap", message);
    });
  }
}
