import { RedisClientType } from "@redis/client";
import { createClient } from "redis";
import { Logger } from "./Logger";

/**
 * Typedef for RedisKeys
 */
interface IRedisKeys {
  // canvas
  pixelColor(x: number, y: number): string;
  canvas(): string;
  heatmap(): string;

  // users
  socketToSub(socketId: string): string;
}

/**
 * Defined as a variable due to boottime augmentation
 */
const RedisKeys: IRedisKeys = {
  pixelColor: (x: number, y: number) => `CANVAS:PIXELS[${x},${y}]:COLOR`,
  canvas: () => `CANVAS:PIXELS`,
  heatmap: () => `CANVAS:HEATMAP`,
  socketToSub: (socketId: string) => `CANVAS:SOCKET:${socketId}`,
};

class _Redis {
  isConnecting = false;
  isConnected = false;
  client: RedisClientType;

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

    this.keys = keys;
  }

  async connect() {
    if (this.isConnected)
      throw new Error("Attempted to run Redis#connect when already connected");

    this.isConnecting = true;
    await this.client.connect();
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

  async getClient() {
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
