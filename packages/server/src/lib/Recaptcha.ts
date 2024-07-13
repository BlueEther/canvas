import { Socket } from "socket.io";
import { User } from "../models/User";
import { getLogger } from "./Logger";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@sc07-canvas/lib/src/net";

const Logger = getLogger("RECAPTCHA");

class Recaptcha_ {
  disabled = false;
  chance: number | null = null;

  constructor() {
    this.disabled =
      !process.env.RECAPTCHA_SITE_KEY ||
      !process.env.RECAPTCHA_SECRET_KEY ||
      !process.env.RECAPTCHA_PIXEL_CHANCE;

    if (!process.env.RECAPTCHA_PIXEL_CHANCE) {
      Logger.warn("No RECAPTCHA_PIXEL_CHANCE set, captchas will not be sent!");
    } else {
      this.chance = parseFloat(process.env.RECAPTCHA_PIXEL_CHANCE);

      if (this.chance > 1 || this.chance < 0) {
        this.chance = null;
        this.disabled = true;
        Logger.warn("RECAPTCHA_PIXEL_CHANCE is not within (0<x<1)");
      }
    }
  }

  maybeChallenge(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>
  ): boolean {
    if (this.disabled || !this.chance) return false;

    if (Math.random() > this.chance) {
      socket.emitWithAck("recaptcha_challenge").then((token) => {
        this.verifyToken(token).then(async (data) => {
          if (!data.success) {
            this.notifyStaffOfError(data).then(() => {});
          } else {
            if (data.score < 0.5 || true) {
              try {
                const user = (await User.fromAuthSession(
                  socket.request.session.user!
                ))!;
                this.notifyStaff(user, data.score).then(() => {});
              } catch (e) {}
            }
          }
        });
      });
      return true;
    }

    return false;
  }

  async verifyToken(
    token: string
  ): Promise<
    | { success: true; challenge_ts: string; hostname: string; score: number }
    | { success: false; "error-codes": string[] }
  > {
    return await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY!}&response=${token}`,
      {
        method: "POST",
      }
    ).then((a) => a.json());
  }

  async notifyStaff(user: User, score: number) {
    if (!process.env.DISCORD_WEBHOOK) return;

    return await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `User ${user.sub} got a low score ${score}`,
      }),
    });
  }

  async notifyStaffOfError(obj: any) {
    if (!process.env.DISCORD_WEBHOOK) return;

    return await fetch(process.env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content:
          "Error while verifying captcha\n```\n" +
          JSON.stringify(obj, null, 2) +
          "\n```",
      }),
    });
  }
}

export const Recaptcha = new Recaptcha_();
