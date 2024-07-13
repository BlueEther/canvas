import client, { register } from "prom-client";
import { prisma } from "./prisma";
import e from "express";
import { SocketServer } from "./SocketServer";
import Canvas from "./Canvas";
import { Redis } from "./redis";
import { CACHE_WORKERS, getCacheWorkerQueueLength } from "../workers/worker";

client.collectDefaultMetrics({
  labels: process.env.NODE_APP_INSTANCE
    ? {
        NODE_APP_INSTANCE: process.env.NODE_APP_INSTANCE,
      }
    : {},
});

export const PixelCount = new client.Gauge({
  name: "pixel_count",
  help: "total pixel count",

  async collect() {
    this.set(await prisma.pixel.count());
  },
});

export const UserCount = new client.Gauge({
  name: "user_count",
  help: "total user count",

  async collect() {
    this.set(await prisma.user.count());
  },
});

export const InstanceCount = new client.Gauge({
  name: "instance_count",
  help: "total number of unique instances",

  async collect() {
    this.set(await prisma.instance.count());
  },
});

export const OnlineUsers = new client.Gauge({
  name: "connected_count",
  help: "total connected sockets",

  async collect() {
    this.set((await SocketServer.instance.io.fetchSockets()).length);
  },
});

/**
 * Rough estimate of filled pixels
 */
export const FilledPixels = new client.Gauge({
  name: "filled_pixels",
  help: "total number of filled pixels",

  async collect() {
    const [width, height] = Canvas.getCanvasConfig().size;
    const filledPixels = await prisma.pixel.findMany({
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

    this.set(filledPixels.length);
  },
});

export const TotalPixels = new client.Gauge({
  name: "total_pixels",
  help: "total number of pixels the canvas allows",

  async collect() {
    const [width, height] = Canvas.getCanvasConfig().size;

    this.set(width * height);
  },
});

const CacheWorkerQueueMain = new client.Gauge({
  name: "cache_worker_callback_queue_main",
  help: "cache worker callback queue length for main process",

  collect() {
    this.set(getCacheWorkerQueueLength());
  },
});

const CacheWorkerQueueWorkers = new client.Gauge({
  name: "cache_worker_queue_workers",
  help: "cache worker write queue length per worker process",
  labelNames: ["worker_id"],

  async collect() {
    const redis = await Redis.getClient();

    for (let i = 0; i < CACHE_WORKERS; i++) {
      this.set(
        {
          worker_id: i,
        },
        await redis.lLen(Redis.key("canvas_cache_write_queue", i))
      );
    }
  },
});

export const handleMetricsEndpoint = async (
  req: e.Request,
  res: e.Response
) => {
  if (!process.env.PROMETHEUS_TOKEN) {
    res.status(500);
    res.send("PROMETHEUS_TOKEN is not set.");
    return;
  }

  if (req.headers.authorization !== "Bearer " + process.env.PROMETHEUS_TOKEN) {
    res.status(401);
    res.send("Invalid bearer token");
    return;
  }

  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
  res.end();
};
