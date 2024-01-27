import type { IncomingMessage } from "http";
import type { Session, SessionData } from "express-session";
import type { Socket } from "socket.io";
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
