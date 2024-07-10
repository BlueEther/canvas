import { parentPort } from "node:worker_threads";
import { Redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/Logger";

type Message = {
  type: "canvasToRedis";
  width: number;
  height: number;
};

const Logger = getLogger("CANVAS_WORK");

/**
 * We run the connection directly instead of via class functions to prevent side effects
 */
const redis = Redis.client;
redis.connect().then(() => {
  Logger.info("Connected to Redis");
});

parentPort?.on("message", (msg: Message) => {
  switch (msg.type) {
    case "canvasToRedis":
      canvasToRedis(msg.width, msg.height).then((str) => {
        parentPort?.postMessage({ type: "canvasToRedis", data: str });
      });
      break;
  }
});

/**
 * Convert database pixels to Redis cache
 *
 * This does not depend on the Canvas class and can be ran inside the worker
 *
 * @param width
 * @param height
 * @returns
 */
const canvasToRedis = async (width: number, height: number) => {
  const now = Date.now();
  Logger.info("Starting canvasToRedis...");

  const dbpixels = await prisma.pixel.findMany({
    where: {
      x: {
        gte: 0,
        lt: width,
      },
      y: {
        gte: 0,
        lt: height,
      },
      isTop: true,
    },
  });

  const pixels: string[] = [];

  // (y -> x) because of how the conversion needs to be done later
  // if this is inverted, the map will flip when rebuilding the cache (5 minute expiry)
  // fixes #24
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      pixels.push(
        dbpixels.find((px) => px.x === x && px.y === y)?.color || "transparent"
      );
    }
  }

  await redis.set(Redis.key("canvas"), pixels.join(","), { EX: 60 * 5 });

  Logger.info(
    "Finished canvasToRedis in " + ((Date.now() - now) / 1000).toFixed(2) + "s"
  );
  return pixels;
};
