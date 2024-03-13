import Canvas from "../lib/Canvas";
import { Redis } from "../lib/redis";

const log = (...data: any) => {
  // eslint-disable-next-line no-console
  console.log(...data);
};

(async () => {
  log("Caching pixels from database to Redis...");
  await Canvas.pixelsToRedis();
  await Redis.disconnect();
  log("Cached");
})();
