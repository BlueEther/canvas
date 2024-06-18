import client, { register } from "prom-client";
import { prisma } from "./prisma";
import e from "express";
import { SocketServer } from "./SocketServer";
import Canvas from "./Canvas";
import { Redis } from "./redis";

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
 * Rough estimate of empty pixels
 */
export const EmptyPixels = new client.Gauge({
  name: "empty_pixels",
  help: "total number of empty pixels",

  async collect() {
    let queries: Promise<boolean>[] = [];

    for (let x = 0; x < Canvas.getCanvasConfig().size[0]; x++) {
      for (let y = 0; y < Canvas.getCanvasConfig().size[1]; y++) {
        queries.push(Canvas.isPixelEmpty(x, y));
      }
    }

    let count = 0;

    const allSettled = await Promise.allSettled(queries);
    for (const settle of allSettled) {
      if (settle.status === "fulfilled") {
        count += Number(settle.value);
      } else {
        count++;
      }
    }

    this.set(count);
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
