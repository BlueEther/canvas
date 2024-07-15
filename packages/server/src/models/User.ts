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
import { ConditionalPromise } from "../lib/utils";
import { CanvasLib } from "@sc07-canvas/lib";
import { getClientConfig } from "../lib/SocketServer";
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
  lastTimeGainStarted: Date;
  pixelStack: number;
  authSession?: AuthSession;
  undoExpires?: Date;
  private _ban?: IUserBan;

  isAdmin: boolean;
  isModerator: boolean;

  sockets: Set<Socket<ClientToServerEvents, ServerToClientEvents>> = new Set();

  private _updatedAt: number;

  private constructor(data: UserDB & { Ban: Ban | null }) {
    Logger.debug("User class instansiated for " + data.sub);

    this.sub = data.sub;
    this.lastTimeGainStarted = data.lastTimeGainStarted;
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

    this.lastTimeGainStarted = userData.lastTimeGainStarted;
    this.pixelStack = userData.pixelStack;
    this.undoExpires = userData.undoExpires || undefined;
    this.isAdmin = userData.isAdmin;
    this.isModerator = userData.isModerator;

    await this.updateBanFromUserData(userData);
  }

  private async updateBanFromUserData(userData: UserDB & { Ban: Ban | null }) {
    if (userData.Ban) {
      this._ban = {
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
    let new_date = new Date();
    if (modifyBy > 0) {
      let cooldown_to_add = 0.0;
      for (let i = 0; i < modifyBy; i++) {
        cooldown_to_add += CanvasLib.getPixelCooldown(
          this.pixelStack + i + 1,
          getClientConfig()
        );
      }

      new_date = new Date(
        this.lastTimeGainStarted.valueOf() + cooldown_to_add * 1000
      );
    } else if (modifyBy < 0) {
      const cooldown_before_change_s = CanvasLib.getPixelCooldown(
        this.pixelStack + 1,
        getClientConfig()
      );
      const cooldown_after_change_s = CanvasLib.getPixelCooldown(
        this.pixelStack + 1 + modifyBy,
        getClientConfig()
      );
      const would_gain_next_at_timestamp_ms =
        this.lastTimeGainStarted.valueOf() + cooldown_before_change_s * 1000;
      const time_before_next =
        would_gain_next_at_timestamp_ms - Date.now().valueOf();
      // To avoid issue if a negative value is present for some reason
      if (time_before_next > 0) {
        if (time_before_next < cooldown_after_change_s * 1000) {
          new_date = new Date(
            Date.now() - cooldown_after_change_s * 1000 + time_before_next
          );
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { sub: this.sub },
      data: {
        pixelStack: { increment: modifyBy },
        lastTimeGainStarted: new_date,
      },
    });

    for (const socket of this.sockets) {
      socket.emit("availablePixels", updatedUser.pixelStack);
      socket.emit("pixelLastPlaced", updatedUser.lastTimeGainStarted.getTime());
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
    const ban = this.getBan();

    if (ban) {
      for (const socket of this.sockets) {
        socket.emit("standing", {
          banned: true,
          until: ban.expires.toISOString(),
          reason: ban.publicNote || undefined,
        });
      }
    } else {
      for (const socket of this.sockets) {
        socket.emit("standing", { banned: false });
      }
    }
  }

  getBan<DoUpdate extends boolean = false>(
    update: DoUpdate = false as DoUpdate
  ): ConditionalPromise<typeof this._ban, DoUpdate> {
    if (update) {
      return new Promise(async (res) => {
        const user = await prisma.user.findFirst({
          where: {
            sub: this.sub,
          },
          include: {
            Ban: true,
          },
        });

        if (!user?.Ban) {
          return res(undefined);
        }

        this._ban = {
          type: "user",
          id: user.Ban.id,
          expires: user.Ban.expiresAt,
          publicNote: user.Ban.publicNote,
        };

        res(this._ban);
      }) as any;
    } else {
      return this._ban as any;
    }
  }

  async ban(
    expires: Date,
    publicNote: string | null | undefined,
    privateNote: string | null | undefined
  ) {
    const ban = await prisma.ban.upsert({
      where: {
        userId: this.sub,
      },
      create: {
        userId: this.sub,
        expiresAt: expires,
        publicNote,
        privateNote,
      },
      update: {
        userId: this.sub,
        expiresAt: expires,
        publicNote,
        privateNote,
      },
    });

    this._ban = {
      id: ban.id,
      type: "user",
      expires,
      publicNote: publicNote || null,
    };

    return ban;
  }

  async unban() {
    const existing = await this.getBan(true);

    if (!existing) throw new UserNotBanned();

    const ban = await prisma.ban.delete({
      where: { id: existing.id },
    });

    return ban;
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

  async trackIP(ip: string) {
    await prisma.iPAddress.upsert({
      where: {
        ip_userSub: {
          ip,
          userSub: this.sub,
        },
      },
      create: {
        ip,
        userSub: this.sub,
        lastUsedAt: new Date(),
      },
      update: {
        ip,
        userSub: this.sub,
        lastUsedAt: new Date(),
      },
    });
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

export class UserNotBanned extends Error {
  constructor() {
    super();
    this.name = "UserNotBanned";
  }
}
