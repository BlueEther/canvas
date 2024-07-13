import { Worker, WorkerOptions } from "node:worker_threads";
import path from "node:path";
import { v4 as uuid } from "uuid";
import { getLogger } from "../lib/Logger";

const Logger = getLogger("WORKER_ROOT");
export const CACHE_WORKERS = process.env.CACHE_WORKERS
  ? parseInt(process.env.CACHE_WORKERS) || 1
  : 1;

export const spawnWorker = (file: string, wkOpts: WorkerOptions = {}) => {
  if (process.env.NODE_ENV === "production") {
    // when compiled we no longer need ts-node as it's already raw JS
    // replace the file extension so it can load it directly

    file = path.join(__dirname, file.replace(".ts", ".js"));
    return new Worker(file, wkOpts);
  } else {
    // when in development we just have TS files
    // this loads TS dynamically when the worker is created

    // https://github.com/TypeStrong/ts-node/issues/676#issuecomment-531620154
    wkOpts.eval = true;
    if (!wkOpts.workerData) {
      wkOpts.workerData = {};
    }
    wkOpts.workerData.__filename = path.join(__dirname, file);
    return new Worker(
      `
          const wk = require('worker_threads');
          require('ts-node').register();
          let file = wk.workerData.__filename;
          delete wk.workerData.__filename;
          require(file);
      `,
      wkOpts
    );
  }
};

// not used as of right now
// dedicated worker threads for specific tasks would go here
const AllWorkers: { [k: string]: Worker } = {};

let cacheWorkers: Worker[] = [];

/**
 * Return consistent worker ID for the specified coordinates
 * @param x
 * @param y
 * @returns
 */
export const getCacheWorkerIdForCoords = (x: number, y: number): number => {
  const key = (x + y) % cacheWorkers.length;
  return key;
};

/**
 * Return consistent worker for the specified coordinates
 * @param x
 * @param y
 * @returns
 */
export const getCacheWorkerForCoords = (x: number, y: number): Worker => {
  return cacheWorkers[getCacheWorkerIdForCoords(x, y)];
};

/**
 * Spawns cache workers
 *
 * Promise resolves when all of them are alive
 *
 * @param num
 */
export const spawnCacheWorkers = async (num?: number): Promise<void> => {
  if (typeof num === "undefined") {
    // if the function isn't told, use the environment variables
    num = CACHE_WORKERS;
  }

  Logger.info(`Spawning ${num} cache workers...`);

  let pending: Promise<any>[] = [];

  for (let i = 0; i < num; i++) {
    const worker = spawnWorker("canvas_cache");

    pending.push(
      new Promise((res) => {
        worker.on("online", () => {
          Logger.info(`Canvas cache worker #${i} is now online`);

          worker.postMessage({ type: "id", workerId: i });

          res(undefined);
        });
      })
    );

    worker.on("error", (err) => {
      Logger.error(`Canvas cache worker #${i} has errored`);
      console.error(err);
    });

    worker.on("exit", (exit) => {
      Logger.warn(`Canvas cache worker #${i} has exited ${exit}`);
      const index = cacheWorkers.indexOf(worker);
      if (index > -1) {
        cacheWorkers.splice(index, 1);
        Logger.info(`Removed dead worker #${i} from pool`);
      }
    });

    setupWorkerCallback(worker);

    cacheWorkers.push(worker);
  }

  await Promise.allSettled(pending);
  Logger.info(`Successfully spawned ${num} cache workers`);
};

export const getCanvasCacheWorker = () => {
  return cacheWorkers[Math.floor(Math.random() * cacheWorkers.length)];
};

let cacheWorkerQueue: { [k: string]: () => any } = {};

/**
 * Prometheus metrics
 * @returns
 */
export const getCacheWorkerQueueLength = () =>
  Object.keys(cacheWorkerQueue).length;

const setupWorkerCallback = (worker: Worker) => {
  worker.on("message", (message: { type: "callback"; callbackId: number }) => {
    if (message.type !== "callback") return;

    const callback = cacheWorkerQueue[message.callbackId];
    if (!callback) {
      Logger.warn(
        "Received callback message from worker, but no callbacks are waiting " +
          message.callbackId
      );
      return;
    }

    callback();
    delete cacheWorkerQueue[message.callbackId];
  });
};

export const callCacheWorker = (type: string, data: any) => {
  return new Promise<void>((res) => {
    const callbackId = uuid();

    cacheWorkerQueue[callbackId] = () => {
      res();
      clearTimeout(watchdog);
    };
    let watchdog = setTimeout(() => {
      Logger.error(
        `Callback for ${type} ${callbackId} has taken too long, is it dead?`
      );
    }, 10000);

    const worker = getCanvasCacheWorker();
    worker.postMessage({
      ...data,
      type,
      callbackId,
    });
  });
};

export const callWorkerMethod = (worker: Worker, type: string, data: any) => {
  return new Promise<void>((res) => {
    const callbackId = Math.floor(Math.random() * 99999);
    Logger.info(`Calling worker method ${type} ${callbackId}`);

    const handleMessage = (message: {
      type: "callback";
      callbackId: number;
    }) => {
      if (message.type !== "callback") return;
      if (message.callbackId !== callbackId) return;

      Logger.info(`Finished worker call ${type} ${callbackId}`);
      res();

      worker.off("message", handleMessage);
    };

    worker.on("message", handleMessage);

    worker.postMessage({
      ...data,
      type,
      callbackId,
    });
  });
};

for (const [name, worker] of Object.entries(AllWorkers)) {
  worker.on("online", () => {
    Logger.info(`${name} worker is now online`);
  });

  worker.on("exit", (exitCode) => {
    Logger.warn(`${name} worker has exited ${exitCode}`);
  });

  worker.on("error", (err) => {
    Logger.warn(`${name} worker has errored ${err.message}`);
    console.error(err);
  });
}
