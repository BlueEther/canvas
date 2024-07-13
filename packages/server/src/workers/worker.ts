import { Worker, WorkerOptions } from "node:worker_threads";
import path from "node:path";
import { getLogger } from "../lib/Logger";

const Logger = getLogger("WORKER_ROOT");

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

const AllWorkers = {
  canvas: spawnWorker("canvas.ts"),
};

export const CanvasWorker = AllWorkers.canvas;

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
