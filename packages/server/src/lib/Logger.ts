import winston, { format } from "winston";
import path from "node:path";
import { createEnum } from "./utils";

// if PIXEL_LOG_PATH is defined, use that, otherwise default to packages/server root
const PIXEL_LOG_PATH =
  process.env.PIXEL_LOG_PATH || path.join(__dirname, "..", "..", "pixels.log");

const formatter = format.printf((options) => {
  let maxModuleWidth = 0;
  for (const module of Object.values(LoggerType)) {
    maxModuleWidth = Math.max(maxModuleWidth, `[${module}]`.length);
  }

  let modulePadding = " ".repeat(
    Math.max(0, maxModuleWidth - `[${options.moduleName}]`.length)
  );

  let parts: string[] = [
    options.timestamp + `  [${options.moduleName || "---"}]` + modulePadding,
    options.level + ":",
    options.message,
  ];

  return parts.join("\t");
});

const Winston = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), formatter),
  transports: [new winston.transports.Console()],
});

// Used by LogMan for writing to pixels.log
export const PixelLogger = winston.createLogger({
  format: format.printf((options) => {
    return [new Date().toISOString(), options.message].join("\t");
  }),
  transports: [
    new winston.transports.File({
      filename: PIXEL_LOG_PATH,
    }),
  ],
});

export const LoggerType = createEnum([
  "MAIN",
  "SETTINGS",
  "CANVAS",
  "HTTP",
  "HTTP/ADMIN",
  "HTTP/CLIENT",
  "REDIS",
  "SOCKET",
  "JOB_WORKER",
  "CANVAS_WORK",
  "WORKER_ROOT",
]);

export const getLogger = (module?: keyof typeof LoggerType) =>
  Winston.child({ moduleName: module });
