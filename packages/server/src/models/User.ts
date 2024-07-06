import { Socket } from "socket.io";
import { getLogger } from "../lib/Logger";
import { prisma } from "../lib/prisma";
import {
  AuthSession,
  ClientToServerEvents,
  IAlert,
  ServerToClientEvents,
} from "@sc07-canvas/lib/src/net";
import { Ban, User as UserDB } from "@prisma/client";
import { Instance } from "./Instance";

const Logger = getLogger();

/**
 * Represents a user ban
 *
 * Has implementation in here for making instance bans retroactive,
 * but at time of writing, instance bans will only block new users
 */
export type IUserBan = {
  id: number;
  expires: Date;
  publicNote: string | null;
} & (
  | {
      type: "user";
    }
  | {
      type: "instance";
      hostname: string;
    }
);

export class User {
  static instances: Map<string, User> = new Map();

  sub: string;
  lastPixelTime: Date;
  pixelStack: number;
  authSession?: AuthSession;
  undoExpires?: Date;
  ban?: IUserBan;

  isAdmin: boolean;
  isModerator: boolean;

  sockets: Set<Socket<ClientToServerEvents, ServerToClientEvents>> = new Set();

  private _updatedAt: number;

  private constructor(data: UserDB & { Ban: Ban | null }) {
    Logger.debug("User class instansiated for " + data.sub);

    this.sub = data.sub;
    this.lastPixelTime = data.lastPixelTime;
    this.pixelStack = data.pixelStack;
    this.undoExpires = data.undoExpires || undefined;

    this.isAdmin = data.isAdmin;
    this.isModerator = data.isModerator;

    this.updateBanFromUserData(data).then(() => {});

    this._updatedAt = Date.now();
  }

  async update(force: boolean = false) {
    if (this.isStale() && !force) return;

    const userData = await prisma.user.findFirst({
      where: {
        sub: this.sub,
      },
      include: {
        Ban: true,
      },
    });

    if (!userData) throw new UserNotFound();

    this.lastPixelTime = userData.lastPixelTime;
    this.pixelStack = userData.pixelStack;
    this.undoExpires = userData.undoExpires || undefined;
    this.isAdmin = userData.isAdmin;
    this.isModerator = userData.isModerator;

    await this.updateBanFromUserData(userData);
  }

  private async updateBanFromUserData(userData: UserDB & { Ban: Ban | null }) {
    if (userData.Ban) {
      this.ban = {
        id: userData.Ban.id,
        expires: userData.Ban.expiresAt,
        publicNote: userData.Ban.publicNote,
        type: "user",
      };
    } else {
      // the code below is for making instance bans retroactive
      //
      // const instance = await this.getInstance();
      // const instanceBan = await instance.getEffectiveBan();
      // if (instanceBan) {
      //   this.ban = {
      //     id: instanceBan.id,
      //     expires: instanceBan.expiresAt,
      //     publicNote: instanceBan.publicNote,
      //     type: "instance",
      //     hostname: instanceBan.hostname,
      //   };
      // }
    }
  }

  async getInstance(): Promise<Instance> {
    const [local, hostname] = this.sub.split("@");
    return await Instance.fromDomain(hostname);
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
   * Sends packet to all user's sockets with current standing information
   */
  updateStanding() {
    if (this.ban) {
      for (const socket of this.sockets) {
        socket.emit("standing", {
          banned: true,
          until: this.ban.expires.toISOString(),
          reason: this.ban.publicNote || undefined,
        });
      }
    } else {
      for (const socket of this.sockets) {
        socket.emit("standing", { banned: false });
      }
    }
  }

  /**
   * Notifies all sockets for this user of a message
   * @param alert
   */
  notify(alert: IAlert) {
    for (const socket of this.sockets) {
      socket.emit("alert", alert);
    }
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
      include: {
        Ban: true,
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
