import { CanvasConfig } from "@sc07-canvas/lib/src/net";
import { prisma } from "./prisma";
import { Redis } from "./redis";
import { SocketServer } from "./SocketServer";

class Canvas {
  private CANVAS_SIZE: [number, number];

  constructor() {
    this.CANVAS_SIZE = [100, 100];
  }

  getCanvasConfig(): CanvasConfig {
    return {
      size: this.CANVAS_SIZE,
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
   * Latest database pixels -> Redis
   */
  async pixelsToRedis() {
    const redis = await Redis.getClient();

    const key = Redis.keyRef("pixelColor");

    for (let x = 0; x < this.CANVAS_SIZE[0]; x++) {
      for (let y = 0; y < this.CANVAS_SIZE[1]; y++) {
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
    for (let y = 0; y < this.CANVAS_SIZE[1]; y++) {
      for (let x = 0; x < this.CANVAS_SIZE[0]; x++) {
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

    pixels[this.CANVAS_SIZE[0] * y + x] =
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
