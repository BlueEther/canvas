import { CanvasConfig } from "@sc07-canvas/lib/src/net";
import { prisma } from "./prisma";
import { Redis } from "./redis";
import { SocketServer } from "./SocketServer";
import { Logger } from "./Logger";

class Canvas {
  /**
   * Size of the canvas
   */
  private canvasSize: [width: number, height: number];

  constructor() {
    this.canvasSize = [100, 100];
  }

  getCanvasConfig(): CanvasConfig {
    return {
      size: this.canvasSize,
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

  /**
   * Change size of the canvas
   *
   * Expensive task, will take a bit
   *
   * @param width
   * @param height
   */
  async setSize(width: number, height: number) {
    Logger.info("Canvas#setSize has started", {
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

    // we're about to use the redis keys, make sure they are all updated
    await this.pixelsToRedis();
    // the redis key is 1D, since the dimentions changed we need to update it
    await this.canvasToRedis();

    // announce the new config, which contains the canvas size
    SocketServer.instance.broadcastConfig();

    // announce new pixel array that was generated previously
    await this.getPixelsArray().then((pixels) => {
      SocketServer.instance.io.emit("canvas", pixels);
    });

    Logger.info("Canvas#setSize has finished");
  }

  /**
   * Latest database pixels -> Redis
   */
  async pixelsToRedis() {
    const redis = await Redis.getClient();

    const key = Redis.keyRef("pixelColor");

    for (let x = 0; x < this.canvasSize[0]; x++) {
      for (let y = 0; y < this.canvasSize[1]; y++) {
        const pixel = await prisma.pixel.findFirst({
          where: {
            x,
            y,
          },
          orderBy: [
            {
              createdAt: "asc",
            },
          ],
        });

        await redis.set(key(x, y), pixel?.color || "transparent");
      }
    }
  }

  /**
   * Redis pixels -> single Redis comma separated list of hex
   * @returns 1D array of pixel values
   */
  async canvasToRedis() {
    const redis = await Redis.getClient();

    const pixels: string[] = [];

    // (y -> x) because of how the conversion needs to be done later
    // if this is inverted, the map will flip when rebuilding the cache (5 minute expiry)
    // fixes #24
    for (let y = 0; y < this.canvasSize[1]; y++) {
      for (let x = 0; x < this.canvasSize[0]; x++) {
        pixels.push(
          (await redis.get(Redis.key("pixelColor", x, y))) || "transparent"
        );
      }
    }

    await redis.set(Redis.key("canvas"), pixels.join(","), { EX: 60 * 5 });

    return pixels;
  }

  /**
   * force an update at a specific position
   */
  async updateCanvasRedisAtPos(x: number, y: number) {
    const redis = await Redis.getClient();

    const pixels: string[] = (
      (await redis.get(Redis.key("canvas"))) || ""
    ).split(",");

    pixels[this.canvasSize[0] * y + x] =
      (await redis.get(Redis.key("pixelColor", x, y))) || "transparent";

    await redis.set(Redis.key("canvas"), pixels.join(","), { EX: 60 * 5 });
  }

  async getPixelsArray() {
    const redis = await Redis.getClient();

    if (await redis.exists(Redis.key("canvas"))) {
      const cached = await redis.get(Redis.key("canvas"));
      return cached!.split(",");
    }

    return await this.canvasToRedis();
  }

  async setPixel(user: { sub: string }, x: number, y: number, hex: string) {
    const redis = await Redis.getClient();

    await prisma.pixel.create({
      data: {
        userId: user.sub,
        color: hex,
        x,
        y,
      },
    });

    await prisma.user.update({
      where: { sub: user.sub },
      data: { lastPixelTime: new Date() },
    });

    await redis.set(Redis.key("pixelColor", x, y), hex);

    // maybe only update specific element?
    // i don't think it needs to be awaited
    await this.updateCanvasRedisAtPos(x, y);
  }

  /**
   * Force a pixel to be updated in redis
   * @param x
   * @param y
   */
  async refreshPixel(x: number, y: number) {
    const redis = await Redis.getClient();
    const key = Redis.key("pixelColor", x, y);

    // find if any pixels exist at this spot, and pick the most recent one
    const pixel = await prisma.pixel.findFirst({
      where: { x, y },
      orderBy: { createdAt: "desc" },
    });
    let paletteColorID = -1;

    // if pixel exists in redis
    if (pixel) {
      redis.set(key, pixel.color);
      paletteColorID = (await prisma.paletteColor.findFirst({
        where: { hex: pixel.color },
      }))!.id;
    } else {
      redis.del(key);
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
}

export default new Canvas();
