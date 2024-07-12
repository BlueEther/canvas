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
      NODE_APP_INSTANCE?: string;
      PORT: string;
      LOG_LEVEL?: string;
      SESSION_SECRET: string;

      PROMETHEUS_TOKEN?: string;

      REDIS_HOST: string;
      REDIS_SESSION_PREFIX?: string;
      REDIS_RATELIMIT_PREFIX?: string;

      /**
       * hostname that is used in the callback
       *
       * @example http://localhost:3000
       * @example https://canvas.com
       */
      OIDC_CALLBACK_HOST: string;
      /**
       * If this is set, enable socket.io CORS to this origin
       *
       * Specifically setting CORS origin is required because of use of credentials (cookies)
       */
      CLIENT_ORIGIN?: string;

      /**
       * If set, use this relative path to serve the client at the root
       */
      SERVE_CLIENT?: string;
      /**
       * If set, use this relative path to serve the admin UI at /admin
       */
      SERVE_ADMIN?: string;

      AUTH_ENDPOINT: string;
      AUTH_CLIENT: string;
      AUTH_SECRET: string;

      MATRIX_HOMESERVER: string;
      ELEMENT_HOST: string;
      MATRIX_GENERAL_ALIAS: string;

      RECAPTCHA_SITE_KEY?: string;
      RECAPTCHA_SECRET_KEY?: string;
      RECAPTCHA_PIXEL_CHANCE?: string;

      DISCORD_WEBHOOK?: string;
    }
  }
}
