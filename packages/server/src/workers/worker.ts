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
