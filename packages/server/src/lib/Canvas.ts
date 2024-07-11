import { CanvasConfig } from "@sc07-canvas/lib/src/net";
import { prisma } from "./prisma";
import { Redis } from "./redis";
import { SocketServer } from "./SocketServer";
import { getLogger } from "./Logger";
import { Pixel } from "@prisma/client";
import { CanvasWorker } from "../workers/worker";

const Logger = getLogger("CANVAS");

class Canvas {
  /**
   * Size of the canvas
   */
  private canvasSize: [width: number, height: number];
  private isFrozen: boolean;

  constructor() {
    this.canvasSize = [100, 100];
    this.isFrozen = false;
  }

  getCanvasConfig(): CanvasConfig {
    return {
      size: this.canvasSize,
      frozen: this.isFrozen,
      zoom: 7,
      pixel: {
        cooldown: 10,
        multiplier: 3,
        maxStack: 6,
      },
      undo: {
        grace_period: 5000,
      },
    };
  }

  get frozen() {
    return this.isFrozen;
  }

  async setFrozen(frozen: boolean) {
    this.isFrozen = frozen;

    await prisma.setting.upsert({
      where: { key: "canvas.frozen" },
      create: {
        key: "canvas.frozen",
        value: JSON.stringify(frozen),
      },
      update: {
        key: "canvas.frozen",
        value: JSON.stringify(frozen),
      },
    });

    if (SocketServer.instance) {
      SocketServer.instance.broadcastConfig();
    } else {
      Logger.warn(
        "[Canvas#setFrozen] SocketServer is not instantiated, cannot broadcast config"
      );
    }
  }

  /**
   * Change size of the canvas
   *
   * Expensive task, will take a bit
   *
   * @param width
   * @param height
   */
  async setSize(width: number, height: number, useStatic = false) {
    if (useStatic) {
      this.canvasSize = [width, height];
      return;
    }

    const now = Date.now();
    Logger.info("[Canvas#setSize] has started", {
      old: this.canvasSize,
      new: [width, height],
    });

    this.canvasSize = [width, height];
    await prisma.setting.upsert({
      where: { key: "canvas.size" },
      create: {
        key: "canvas.size",
        value: JSON.stringify({ width, height }),
      },
      update: {
        key: "canvas.size",
        value: JSON.stringify({ width, height }),
      },
    });

    // the redis key is 1D, since the dimentions changed we need to update it
    await this.canvasToRedis();

    // this gets called on startup, before the SocketServer is initialized
    // so only call if it's available
    if (SocketServer.instance) {
      // announce the new config, which contains the canvas size
      SocketServer.instance.broadcastConfig();

      // announce new pixel array that was generated previously
      await this.getPixelsArray().then((pixels) => {
        SocketServer.instance?.io.emit("canvas", pixels);
      });
    } else {
      Logger.warn(
        "[Canvas#setSize] No SocketServer instance, cannot broadcast config change"
      );
    }

    Logger.info(
      "[Canvas#setSize] has finished in " +
        ((Date.now() - now) / 1000).toFixed(1) +
        " seconds"
    );
  }

  async forceUpdatePixelIsTop() {
    const now = Date.now();
    Logger.info("[Canvas#forceUpdatePixelIsTop] is starting...");

    for (let x = 0; x < this.canvasSize[0]; x++) {
      for (let y = 0; y < this.canvasSize[1]; y++) {
        const pixel = (
          await prisma.pixel.findMany({
            where: { x, y },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          })
        )?.[0];

        if (pixel) {
          await prisma.pixel.update({
            where: {
              id: pixel.id,
            },
            data: {
              isTop: true,
            },
          });
        }
      }
    }

    Logger.info(
      "[Canvas#forceUpdatePixelIsTop] has finished in " +
        ((Date.now() - now) / 1000).toFixed(1) +
        " seconds"
    );
  }

  /**
   * Undo a pixel
   * @throws Error "Pixel is not on top"
   * @param pixel
   */
  async undoPixel(pixel: Pixel) {
    if (!pixel.isTop) throw new Error("Pixel is not on top");

    await prisma.pixel.update({
      where: { id: pixel.id },
      data: {
        deletedAt: new Date(),
        isTop: false,
      },
    });

    const coveringPixel = (
      await prisma.pixel.findMany({
        where: { x: pixel.x, y: pixel.y, createdAt: { lt: pixel.createdAt } },
        orderBy: { createdAt: "desc" },
        take: 1,
      })
    )?.[0];

    if (coveringPixel) {
      await prisma.pixel.update({
        where: { id: coveringPixel.id },
        data: {
          isTop: true,
        },
      });
    }
  }

  /**
   * Converts database pixels to Redis string
   *
   * @worker
   * @returns
   */
  canvasToRedis(): Promise<string[]> {
    return new Promise((res) => {
      Logger.info("Triggering canvasToRedis()");
      const [width, height] = this.getCanvasConfig().size;

      CanvasWorker.once("message", (msg) => {
        if (msg.type === "canvasToRedis") {
          Logger.info("Finished canvasToRedis()");
          res(msg.data);
        }
      });

      CanvasWorker.postMessage({
        type: "canvasToRedis",
        width,
        height,
      });
    });
  }

  /**
   * force an update at a specific position
   */
  async updateCanvasRedisAtPos(x: number, y: number) {
    const redis = await Redis.getClient();

    const pixels: string[] = (
      (await redis.get(Redis.key("canvas"))) || ""
    ).split(",");

    const dbpixel = await this.getPixel(x, y);

    pixels[this.canvasSize[0] * y + x] = dbpixel?.color || "transparent";

    await redis.set(Redis.key("canvas"), pixels.join(","), { EX: 60 * 5 });
  }

  async updateCanvasRedisWithBatch(
    pixelBatch: { x: number; y: number; hex: string }[]
  ) {
    const redis = await Redis.getClient();

    const pixels: string[] = (
      (await redis.get(Redis.key("canvas"))) || ""
    ).split(",");

    for (const pixel of pixelBatch) {
      pixels[this.canvasSize[0] * pixel.y + pixel.x] = pixel.hex;
    }

    await redis.set(Redis.key("canvas"), pixels.join(","), { EX: 60 * 5 });
  }

  async isPixelArrayCached() {
    const redis = await Redis.getClient();

    return await redis.exists(Redis.key("canvas"));
  }

  async getPixelsArray() {
    const redis = await Redis.getClient();

    if (await redis.exists(Redis.key("canvas"))) {
      const cached = await redis.get(Redis.key("canvas"));
      return cached!.split(",");
    }

    return await this.canvasToRedis();
  }

  /**
   * Get if a pixel is maybe empty
   * @param x
   * @param y
   * @returns
   */
  async isPixelEmpty(x: number, y: number) {
    const pixel = await this.getPixel(x, y);
    return pixel === null;
  }

  async getPixel(x: number, y: number) {
    return await prisma.pixel.findFirst({
      where: {
        x,
        y,
        isTop: true,
      },
    });
  }

  async fillArea(
    user: { sub: string },
    start: [x: number, y: number],
    end: [x: number, y: number],
    hex: string
  ) {
    await prisma.pixel.updateMany({
      where: {
        x: {
          gte: start[0],
          lt: end[0],
        },
        y: {
          gte: start[1],
          lt: end[1],
        },
        isTop: true,
      },
      data: {
        isTop: false,
      },
    });

    let pixels: {
      x: number;
      y: number;
    }[] = [];

    for (let x = start[0]; x <= end[0]; x++) {
      for (let y = start[1]; y <= end[1]; y++) {
        pixels.push({
          x,
          y,
        });
      }
    }

    await prisma.pixel.createMany({
      data: pixels.map((px) => ({
        userId: user.sub,
        color: hex,
        isTop: true,
        isModAction: true,
        ...px,
      })),
    });

    await this.updateCanvasRedisWithBatch(
      pixels.map((px) => ({
        ...px,
        hex,
      }))
    );
  }

  async setPixel(
    user: { sub: string },
    x: number,
    y: number,
    hex: string,
    isModAction: boolean
  ) {
    // only one pixel can be on top at (x,y)
    await prisma.pixel.updateMany({
      where: { x, y, isTop: true },
      data: {
        isTop: false,
      },
    });

    await prisma.pixel.create({
      data: {
        userId: user.sub,
        color: hex,
        x,
        y,
        isTop: true,
        isModAction,
      },
    });

    await prisma.user.update({
      where: { sub: user.sub },
      data: { lastPixelTime: new Date() },
    });

    // maybe only update specific element?
    // i don't think it needs to be awaited
    await this.updateCanvasRedisAtPos(x, y);

    Logger.info(`${user.sub} placed pixel at (${x}, ${y})`);
  }

  /**
   * Force a pixel to be updated in redis
   * @param x
   * @param y
   */
  async refreshPixel(x: number, y: number) {
    // find if any pixels exist at this spot, and pick the most recent one
    const pixel = await this.getPixel(x, y);
    let paletteColorID = -1;

    // if pixel exists in redis
    if (pixel) {
      paletteColorID = (await prisma.paletteColor.findFirst({
        where: { hex: pixel.color },
      }))!.id;
    }

    await this.updateCanvasRedisAtPos(x, y);

    // announce to everyone the pixel's color
    // using -1 if no pixel is there anymore
    SocketServer.instance.io.emit("pixel", {
      x,
      y,
      color: paletteColorID,
    });
  }

  /**
   * Generate heatmap of active pixels
   *
   * @note expensive operation, takes a bit to execute
   * @returns 2 character strings with 0-100 in radix 36 (depends on canvas size)
   */
  async generateHeatmap() {
    const redis_set = await Redis.getClient("MAIN");
    const redis_sub = await Redis.getClient("SUB");

    const now = Date.now();
    const minimumDate = new Date();
    minimumDate.setHours(minimumDate.getHours() - 3); // 3 hours ago

    const pad = (str: string) => (str.length < 2 ? "0" : "") + str;

    const heatmap: string[] = [];

    const topPixels = await prisma.pixel.findMany({
      where: { isTop: true, createdAt: { gte: minimumDate } },
    });

    for (let y = 0; y < this.canvasSize[1]; y++) {
      const arr: number[] = [];

      for (let x = 0; x < this.canvasSize[0]; x++) {
        const pixel = topPixels.find((px) => px.x === x && px.y === y);

        if (pixel) {
          arr.push(
            ((1 -
              (now - pixel.createdAt.getTime()) /
                (now - minimumDate.getTime())) *
              100) >>
              0
          );
        } else {
          arr.push(0);
        }
      }

      heatmap.push(arr.map((num) => pad(num.toString(36))).join(""));
    }

    const heatmapStr = heatmap.join("");

    // cache for 5 minutes
    await redis_set.setEx(Redis.key("heatmap"), 60 * 5, heatmapStr);

    // notify anyone interested about the new heatmap
    await redis_set.publish(Redis.key("channel_heatmap"), heatmapStr);
    // SocketServer.instance.io.to("sub:heatmap").emit("heatmap", heatmapStr);

    return heatmapStr;
  }

  /**
   * Get cache heatmap safely
   * @returns see Canvas#generateHeatmap
   */
  async getCachedHeatmap(): Promise<string | undefined> {
    const redis = await Redis.getClient();

    if (!(await redis.exists(Redis.key("heatmap")))) {
      Logger.warn("Canvas#getCachedHeatmap has no cached heatmap");
      return undefined;
    }

    return (await redis.get(Redis.key("heatmap"))) as string;
  }
}

export default new Canvas();
