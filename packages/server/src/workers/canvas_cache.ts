/**
 * Cache the contents of the database into redis keys
 *
 * Each cache chunk should aim be 100x100 pixels
 */

import { parentPort } from "node:worker_threads";
import { getLogger } from "../lib/Logger";
import { Redis } from "../lib/redis";
import { prisma } from "../lib/prisma";

// TODO: config maybe?
// <!> this value is hardcoded in #getCanvasSectionFromCoords
const canvasSectionSize = [100, 100];

type Message =
  | { type: "id"; workerId: number }
  | {
      type: "cache";
      start: [x: number, y: number];
      end: [x: number, y: number];
      callbackId: string;
    }
  | {
      type: "write_pixel";
    };

let Logger = getLogger("CANVAS_WORK");

/**
 * We run the connection directly instead of via class functions to prevent side effects
 */
const redis = Redis.client;
redis.connect().then(() => {
  Logger.info("Connected to Redis");
});

let workerId: number;

parentPort?.on("message", (msg: Message) => {
  switch (msg.type) {
    case "id":
      workerId = msg.workerId;
      Logger = getLogger("CANVAS_WORK", workerId);
      Logger.info("Received worker ID assignment: " + workerId);
      startWriteQueue().then(() => {});
      break;
    case "cache":
      doCache(msg.start, msg.end).then(() => {
        parentPort?.postMessage({
          type: "callback",
          callbackId: msg.callbackId,
        });
      });
      break;
  }
});

/**
 * Get canvas section from coordinates
 *
 * @note This is hardcoded to expect the section size to be 100x100 pixels
 *
 * @param x
 * @param y
 */
const getCanvasSectionFromCoords = (
  x: number,
  y: number
): { start: [x: number, y: number]; end: [x: number, y: number] } => {
  // since we are assuming the section size is 100x100
  // we can get the start position based on the hundreds position
  const baseX = Math.floor((x % 1000) / 100); // get the hundreds
  const baseY = Math.floor((y % 1000) / 100); // get the hundreds

  return {
    start: [baseX * 100, baseY * 100],
    end: [baseX * 100 + 100, baseY * 100 + 100],
  };
};

const startWriteQueue = async () => {
  const item = await redis.lPop(
    Redis.key("canvas_cache_write_queue", workerId)
  );
  if (!item) {
    setTimeout(() => {
      startWriteQueue();
    }, 250);
    return;
  }

  const x = parseInt(item.split(",")[0]);
  const y = parseInt(item.split(",")[1]);
  const color = item.split(",")[2];

  const section = getCanvasSectionFromCoords(x, y);

  const pixels: string[] = (
    (await redis.get(
      Redis.key("canvas_section", section.start, section.end)
    )) || ""
  ).split(",");

  const arrX = x - section.start[0];
  const arrY = y - section.start[1];

  pixels[canvasSectionSize[0] * arrY + arrX] = color;

  await redis.set(
    Redis.key("canvas_section", section.start, section.end),
    pixels.join(",")
  );

  startWriteQueue();
};

const doCache = async (
  start: [x: number, y: number],
  end: [x: number, y: number]
) => {
  const now = Date.now();
  Logger.info(
    "starting cache of section " + start.join(",") + " -> " + end.join(",")
  );
  const dbpixels = await prisma.pixel.findMany({
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
  });

  const pixels: string[] = [];

  // (y -> x) because of how the conversion needs to be done later
  // if this is inverted, the map will flip when rebuilding the cache (5 minute expiry)
  // fixes #24
  for (let y = start[1]; y < end[1]; y++) {
    for (let x = start[0]; x < end[0]; x++) {
      pixels.push(
        dbpixels.find((px) => px.x === x && px.y === y)?.color || "transparent"
      );
    }
  }

  await redis.set(Redis.key("canvas_section", start, end), pixels.join(","));

  Logger.info(
    "finished cache of section " +
      start.join(",") +
      " -> " +
      end.join(",") +
      " in " +
      ((Date.now() - now) / 1000).toFixed(2) +
      "s"
  );
};
