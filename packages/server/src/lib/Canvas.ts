import { prisma } from "./prisma";
import { getRedis } from "./redis";

const redis_keys = {
  pixelColor: (x: number, y: number) => `CANVAS:PIXELS[${x},${y}]:COLOR`,
  canvas: () => `CANVAS:PIXELS`,
};

class Canvas {
  private CANVAS_SIZE: [number, number];

  constructor() {
    this.CANVAS_SIZE = [100, 100];
  }

  getCanvasConfig() {
    return {
      size: this.CANVAS_SIZE,
      zoom: 7,
    };
  }

  /**
   * Latest database pixels -> Redis
   */
  async pixelsToRedis() {
    const redis = await getRedis();

    const key = redis_keys.pixelColor;

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
    const redis = await getRedis();

    let pixels: string[] = [];

    for (let x = 0; x < this.CANVAS_SIZE[0]; x++) {
      for (let y = 0; y < this.CANVAS_SIZE[1]; y++) {
        pixels.push(
          (await redis.get(redis_keys.pixelColor(x, y))) || "transparent"
        );
      }
    }

    await redis.set(redis_keys.canvas(), pixels.join(","), { EX: 60 * 5 });

    return pixels;
  }

  /**
   * force an update at a specific position
   */
  async updateCanvasRedisAtPos(x: number, y: number) {
    const redis = await getRedis();

    let pixels: string[] = ((await redis.get(redis_keys.canvas())) || "").split(
      ","
    );

    pixels[this.CANVAS_SIZE[0] * y + x] =
      (await redis.get(redis_keys.pixelColor(x, y))) || "transparent";

    await redis.set(redis_keys.canvas(), pixels.join(","), { EX: 60 * 5 });
  }

  async getPixelsArray() {
    const redis = await getRedis();

    if (await redis.exists(redis_keys.canvas())) {
      const cached = await redis.get(redis_keys.canvas());
      return cached!.split(",");
    }

    return await this.canvasToRedis();
  }

  async setPixel(user: { sub: string }, x: number, y: number, hex: string) {
    const redis = await getRedis();

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

    await redis.set(`CANVAS:PIXELS[${x},${y}]:COLOR`, hex);

    // maybe only update specific element?
    // i don't think it needs to be awaited
    await this.updateCanvasRedisAtPos(x, y);
  }
}

export default new Canvas();
