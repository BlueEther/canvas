import { parentPort } from "node:worker_threads";
import { Redis } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/Logger";
import { Pixel } from "@prisma/client";

type Message =
  | { type: "canvasSize"; width: number; height: number }
  | {
      type: "canvasToRedis";
    }
  | {
      type: "updateCanvasRedisAtPos";
      callbackId: number;
      x: number;
      y: number;
      hex: string | "transparent";
    }
  | {
      type: "updateCanvasRedisWithBatch";
      callbackId: number;
      batch: { x: number; y: number; hex: string }[];
    };

const Logger = getLogger("CANVAS_WORK");

/**
 * We run the connection directly instead of via class functions to prevent side effects
 */
const redis = Redis.client;
redis.connect().then(() => {
  Logger.info("Connected to Redis");
});

const queuedCanvasRedis: {
  id: number;
  pixels: { x: number; y: number; hex: string | "transparent" }[];
}[] = [];

let canvasSize = { width: -1, height: -1 };

parentPort?.on("message", (msg: Message) => {
  switch (msg.type) {
    case "canvasSize":
      canvasSize = { width: msg.width, height: msg.height };
      Logger.info("Received canvasSize " + JSON.stringify(canvasSize));
      break;
    case "canvasToRedis":
      if (canvasSize.width === -1 || canvasSize.height === -1) {
        Logger.error("Received canvasToRedis but i do not have the dimentions");
        return;
      }

      canvasToRedis(canvasSize.width, canvasSize.height).then((str) => {
        parentPort?.postMessage({ type: "canvasToRedis", data: str });
      });
      break;
    case "updateCanvasRedisAtPos":
      queuedCanvasRedis.push({
        id: msg.callbackId,
        pixels: [{ x: msg.x, y: msg.y, hex: msg.hex }],
      });
      startCanvasRedisIfNeeded();
      break;
    case "updateCanvasRedisWithBatch":
      queuedCanvasRedis.push({
        id: msg.callbackId,
        pixels: msg.batch,
      });
      startCanvasRedisIfNeeded();
      break;
  }
});

const execCallback = (id: number) => {
  parentPort?.postMessage({ type: "callback", callbackId: id });
};

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

let isCanvasRedisWorking = false;

const startCanvasRedisIfNeeded = () => {
  if (isCanvasRedisWorking) return;

  tickCanvasRedis();
};

const tickCanvasRedis = async () => {
  isCanvasRedisWorking = true;

  const item = queuedCanvasRedis.shift();
  if (!item) {
    isCanvasRedisWorking = false;
    return;
  }

  const pixels: string[] = ((await redis.get(Redis.key("canvas"))) || "").split(
    ","
  );

  for (const pixel of item.pixels) {
    pixels[canvasSize.width * pixel.y + pixel.x] = pixel.hex;
  }

  await redis.set(Redis.key("canvas"), pixels.join(","), { EX: 60 * 5 });

  execCallback(item.id);

  await tickCanvasRedis();
};
