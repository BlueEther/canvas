import winston, { format } from "winston";
import { createEnum } from "./utils";

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
]);

export const getLogger = (module?: keyof typeof LoggerType) =>
  Winston.child({ moduleName: module });
