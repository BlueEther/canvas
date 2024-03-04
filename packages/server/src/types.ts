import type { Session } from "express-session";
import session from "express-session";
import { AuthSession } from "@sc07-canvas/lib/src/net";

declare module "express-session" {
  interface SessionData {
    user: AuthSession;
  }
}

declare module "http" {
  interface IncomingMessage {
    cookieHolder?: string;
    session: Session & Partial<session.SessionData>;
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT: string;
      LOG_LEVEL?: string;
      SESSION_SECRET: string;
      REDIS_HOST: string;
      REDIS_SESSION_PREFIX: string;

      /**
       * If this is set, enable socket.io CORS to this origin
       *
       * Specifically setting CORS origin is required because of use of credentials (cookies)
       */
      CLIENT_ORIGIN?: string;
    }
  }
}
