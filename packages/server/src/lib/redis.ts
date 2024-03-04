import { RedisClientType } from "@redis/client";
import { createClient } from "redis";
import { Logger } from "./Logger";

class _Redis {
  isConnected = false;
  client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_HOST,
    });
  }

  async connect() {
    if (this.isConnected)
      throw new Error("Attempted to run Redis#connect when already connected");

    await this.client.connect();
    Logger.info("Connected to Redis");
    this.isConnected = true;
  }

  async getClient() {
    if (!this.isConnected) {
      await this.connect();
      this.isConnected = true;
    }

    return this.client;
  }
}

export const Redis = new _Redis();
