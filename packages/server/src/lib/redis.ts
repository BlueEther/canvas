import { RedisClientType } from "@redis/client";
import { createClient } from "redis";
import { getLogger } from "./Logger";

const Logger = getLogger("REDIS");

/**
 * Typedef for RedisKeys
 */
interface IRedisKeys {
  // canvas
  // canvas(): string;
  heatmap(): string;
  canvas_section(
    start: [x: number, y: number],
    end: [x: number, y: number]
  ): string;
  canvas_cache_write_queue(workerId: number): string;

  // users
  socketToSub(socketId: string): string;

  // pub/sub channels
  channel_heatmap(): string;
}

/**
 * Defined as a variable due to boottime augmentation
 */
const RedisKeys: IRedisKeys = {
  // canvas: () => `CANVAS:PIXELS`,
  heatmap: () => `CANVAS:HEATMAP`,
  canvas_section: (start, end) =>
    `CANVAS:PIXELS:${start.join(",")}:${end.join(",")}`,
  canvas_cache_write_queue: (workerId) => `CANVAS:CACHE_QUEUE:${workerId}`,
  socketToSub: (socketId: string) => `CANVAS:SOCKET:${socketId}`,
  channel_heatmap: () => `CANVAS:HEATMAP`,
};

class _Redis {
  isConnecting = false;
  isConnected = false;
  client: RedisClientType;
  sub_client: RedisClientType; // the client used for pubsub

  waitingForConnect: ((...args: any) => any)[] = [];

  keys: IRedisKeys;

  /**
   * Redis client wrapper constructor
   *
   * @param keys Definition of keys, passed as an argument to allow for augmentation from configuration on boot
   */
  constructor(keys: IRedisKeys) {
    this.client = createClient({
      url: process.env.REDIS_HOST,
    });
    this.sub_client = createClient({
      url: process.env.REDIS_HOST,
    });

    this.keys = keys;
  }

  async connect() {
    if (this.isConnected)
      throw new Error("Attempted to run Redis#connect when already connected");

    this.isConnecting = true;
    await this.client.connect();
    await this.sub_client.connect();
    Logger.info(
      `Connected to Redis, there's ${this.waitingForConnect.length} function(s) waiting for Redis`
    );
    this.isConnecting = false;
    this.isConnected = true;

    for (const func of this.waitingForConnect) {
      func();
    }
  }

  async disconnect() {
    if (!this.isConnected) {
      Logger.warn("Redis#disconnect called while not connected");
      return;
    }

    await this.client.disconnect();
    Logger.info("Disconnected from Redis");
    this.isConnected = false;
  }

  async getClient(intent: "MAIN" | "SUB" = "MAIN") {
    if (this.isConnecting) {
      await (() =>
        new Promise((res) => {
          Logger.warn("getClient() called and is now pending in queue");
          this.waitingForConnect.push(res);
        }))();
    }

    if (!this.isConnected) {
      await this.connect();
      this.isConnected = true;
    }

    if (intent === "SUB") {
      return this.sub_client;
    }

    return this.client;
  }

  key<Key extends keyof IRedisKeys>(
    key: Key,
    ...rest: Parameters<IRedisKeys[Key]>
  ): string {
    return (this.keys[key] as any)(...rest);
  }

  keyRef<Key extends keyof IRedisKeys>(
    key: Key
  ): (...params: Parameters<IRedisKeys[Key]>) => string {
    return (...params) => this.key(key, ...params);
  }
}

export const Redis = new _Redis(RedisKeys);
