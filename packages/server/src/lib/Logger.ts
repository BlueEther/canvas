import winston, { format } from "winston";

export const Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.splat(), format.cli()),
  transports: [new winston.transports.Console()],
});
