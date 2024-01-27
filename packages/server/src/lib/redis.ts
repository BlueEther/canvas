import { RedisClientType } from "@redis/client";
import { createClient } from "redis";

let isConnected = false;
export const client = createClient();

export const getRedis = async () => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }

  return client;
};
