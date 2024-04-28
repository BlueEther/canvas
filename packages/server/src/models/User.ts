import { Socket } from "socket.io";
import { Logger } from "../lib/Logger";
import { prisma } from "../lib/prisma";
import {
  AuthSession,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@sc07-canvas/lib/src/net";

interface IUserData {
  sub: string;
  lastPixelTime: Date;
  pixelStack: number;
  undoExpires: Date | null;
}

export class User {
  static instances: Map<string, User> = new Map();

  sub: string;
  lastPixelTime: Date;
  pixelStack: number;
  authSession?: AuthSession;
  undoExpires?: Date;

  sockets: Set<Socket<ClientToServerEvents, ServerToClientEvents>> = new Set();

  private _updatedAt: number;

  private constructor(data: IUserData) {
    Logger.debug("User class instansiated for " + data.sub);

    this.sub = data.sub;
    this.lastPixelTime = data.lastPixelTime;
    this.pixelStack = data.pixelStack;
    this.undoExpires = data.undoExpires || undefined;

    this._updatedAt = Date.now();
  }

  async update(force: boolean = false) {
    if (this.isStale() && !force) return;

    const userData = await prisma.user.findFirst({
      where: {
        sub: this.sub,
      },
    });

    if (!userData) throw new UserNotFound();

    this.lastPixelTime = userData.lastPixelTime;
    this.pixelStack = userData.pixelStack;
    this.undoExpires = userData.undoExpires || undefined;
  }

  async modifyStack(modifyBy: number): Promise<any> {
    const updatedUser = await prisma.user.update({
      where: { sub: this.sub },
      data: {
        pixelStack: { increment: modifyBy },
      },
    });

    for (const socket of this.sockets) {
      socket.emit("availablePixels", updatedUser.pixelStack);
    }

    // we just modified the user data, so we should force an update
    await this.update(true);
  }

  /**
   * Set undoExpires in database and notify all user's sockets of undo ttl
   */
  async setUndo(expires?: Date) {
    if (expires) {
      // expiration being set

      await prisma.user.update({
        where: { sub: this.sub },
        data: {
          undoExpires: expires,
        },
      });

      for (const socket of this.sockets) {
        socket.emit("undo", { available: true, expireAt: expires.getTime() });
      }
    } else {
      // clear undo capability

      await prisma.user.update({
        where: { sub: this.sub },
        data: {
          undoExpires: undefined,
        },
      });

      for (const socket of this.sockets) {
        socket.emit("undo", { available: false });
      }
    }

    await this.update(true);
  }

  /**
   * Determine if this user data is stale and should be updated
   * @see User#update
   * @returns if this user data is stale
   */
  private isStale() {
    return Date.now() - this._updatedAt >= 1000 * 60;
  }

  static async fromAuthSession(auth: AuthSession): Promise<User | undefined> {
    try {
      const user = await this.fromSub(
        auth.user.username + "@" + auth.service.instance.hostname
      );
      user.authSession = auth;
      return user;
    } catch (e) {
      if (e instanceof UserNotFound) {
        return undefined;
      } else {
        throw e;
      }
    }
  }

  static async fromSub(sub: string): Promise<User> {
    if (this.instances.has(sub)) return this.instances.get(sub)!;

    const userData = await prisma.user.findFirst({
      where: {
        sub,
      },
    });

    if (!userData) throw new UserNotFound();

    const newUser = new User(userData);
    this.instances.set(sub, newUser);
    return newUser;
  }
}

export class UserNotFound extends Error {
  constructor() {
    super();
    this.name = "UserNotFound";
  }
}
