import { AuditLog as AuditLogDB, Ban, User } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class AuditLog {
  static Factory(user: User | string | null) {
    return new AuditLogFactory(user);
  }

  static async createEmpty(
    user: User,
    action: AuditLogDB["action"],
    reason?: string
  ) {
    return await prisma.auditLog.create({
      data: {
        userId: user.sub,
        action,
        reason,
      },
    });
  }
}

class AuditLogFactory {
  /**
   * User who committed the action
   *
   * If null; the system did the action
   *
   * @nullable
   */
  private _userId: string | null;
  /**
   * @required
   */
  private _action?: AuditLogDB["action"];
  private _reason: string | null = null;
  private _comment: string | null = null;

  /**
   * Associated ban, if applicable
   */
  private _ban?: Ban;

  constructor(user: User | string | null) {
    if (typeof user === "string" || user === null) {
      this._userId = user;
    } else {
      this._userId = user.sub;
    }
  }

  doing(action: AuditLogDB["action"]) {
    this._action = action;
    return this;
  }

  reason(reason: string | null) {
    this._reason = reason;
    return this;
  }

  /**
   * Add comment from the service
   * @param comment
   * @returns
   */
  withComment(comment: string | null) {
    this._comment = comment;
    return this;
  }

  withBan(ban: Ban) {
    this._ban = ban;
    return this;
  }

  async create() {
    if (!this._action) {
      throw new Error("Missing action");
    }

    return await prisma.auditLog.create({
      data: {
        action: this._action,
        userId: this._userId || null,
        reason: this._reason,
        comment: this._comment,

        banId: this._ban?.id,
      },
    });
  }
}
