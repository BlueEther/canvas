import { Router } from "express";
import { User, UserNotBanned, UserNotFound } from "../models/User";
import Canvas from "../lib/Canvas";
import { getLogger } from "../lib/Logger";
import { RateLimiter } from "../lib/RateLimiter";
import { prisma } from "../lib/prisma";
import { SocketServer } from "../lib/SocketServer";
import {
  Instance,
  InstanceNotBanned,
  InstanceNotFound,
} from "../models/Instance";
import { AuditLog } from "../models/AuditLog";
import { LogMan } from "../lib/LogMan";

const app = Router();
const Logger = getLogger("HTTP/ADMIN");

app.use(RateLimiter.ADMIN);

app.use(async (req, res, next) => {
  if (!req.session.user) {
    res.status(401).json({
      success: false,
      error: "You are not logged in",
    });
    return;
  }

  const user = await User.fromAuthSession(req.session.user);
  if (!user) {
    res.status(400).json({
      success: false,
      error: "User data does not exist?",
    });
    return;
  }

  if (!user.isAdmin) {
    res.status(403).json({
      success: false,
      error: "user is not admin",
    });
    return;
  }

  next();
});

app.get("/check", (req, res) => {
  res.send({ success: true });
});

app.get("/canvas/size", async (req, res) => {
  const config = Canvas.getCanvasConfig();

  res.json({
    success: true,
    size: {
      width: config.size[0],
      height: config.size[1],
    },
  });
});

/**
 * Update canvas size
 *
 * @header X-Audit
 * @body width number
 * @body height number
 */
app.post("/canvas/size", async (req, res) => {
  const width = parseInt(req.body.width || "-1");
  const height = parseInt(req.body.height || "-1");

  if (
    isNaN(width) ||
    isNaN(height) ||
    width < 1 ||
    height < 1 ||
    width > 10000 ||
    height > 10000
  ) {
    res.status(400).json({ success: false, error: "what are you doing" });
    return;
  }

  await Canvas.setSize(width, height);

  // we log this here because Canvas#setSize is ran at launch
  // this is currently the only way the size is changed is via the API
  LogMan.log("canvas_size", { width, height });

  const user = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = AuditLog.Factory(user.sub)
    .doing("CANVAS_SIZE")
    .reason(req.header("X-Audit") || null)
    .withComment(`Changed canvas size to ${width}x${height}`)
    .create();

  res.send({ success: true, auditLog });
});

/**
 * Get canvas frozen status
 */
app.get("/canvas/freeze", async (req, res) => {
  res.send({ success: true, frozen: Canvas.frozen });
});

/**
 * Freeze the canvas
 *
 * @header X-Audit
 */
app.post("/canvas/freeze", async (req, res) => {
  await Canvas.setFrozen(true);

  // same reason as canvas size changes, we log this here because #setFrozen is ran at startup
  LogMan.log("canvas_freeze", {});

  const user = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = AuditLog.Factory(user.sub)
    .doing("CANVAS_FREEZE")
    .reason(req.header("X-Audit") || null)
    .withComment(`Freezed the canvas`)
    .create();

  res.send({ success: true, auditLog });
});

/**
 * Unfreeze the canvas
 *
 * @header X-Audit
 */
app.delete("/canvas/freeze", async (req, res) => {
  await Canvas.setFrozen(false);

  // same reason as canvas size changes, we log this here because #setFrozen is ran at startup
  LogMan.log("canvas_unfreeze", {});

  const user = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = AuditLog.Factory(user.sub)
    .doing("CANVAS_UNFREEZE")
    .reason(req.header("X-Audit") || null)
    .withComment(`Un-Freezed the canvas`)
    .create();

  res.send({ success: true, auditLog });
});

app.put("/canvas/heatmap", async (req, res) => {
  try {
    await Canvas.generateHeatmap();

    res.send({ success: true });
  } catch (e) {
    Logger.error(e);
    res.send({ success: false, error: "Failed to generate" });
  }
});

app.post("/canvas/forceUpdateTop", async (req, res) => {
  Logger.info("Starting force updating isTop");

  await Canvas.forceUpdatePixelIsTop();

  Logger.info("Finished force updating isTop");
  res.send({ success: true });
});

app.get("/canvas/:x/:y", async (req, res) => {
  const x = parseInt(req.params.x);
  const y = parseInt(req.params.y);

  res.json(await Canvas.getPixel(x, y));
});

app.post("/canvas/stress", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res
      .status(500)
      .json({
        success: false,
        error: "this is terrible idea to execute this in production",
      });
    return;
  }

  if (
    typeof req.body?.width !== "number" ||
    typeof req.body?.height !== "number"
  ) {
    res.status(400).json({ success: false, error: "width/height is invalid" });
    return;
  }

  const style: "random" | "xygradient" = req.body.style || "random";

  const width: number = req.body.width;
  const height: number = req.body.height;
  const user = (await User.fromAuthSession(req.session.user!))!;
  const paletteColors = await prisma.paletteColor.findMany({});

  let promises: Promise<any>[] = [];

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      promises.push(
        new Promise(async (res) => {
          let colorIndex: number;
          if (style === "xygradient") {
            colorIndex =
              Math.floor((x / width) * (paletteColors.length / 2)) +
              Math.floor((y / height) * (paletteColors.length / 2));
          } else {
            colorIndex = Math.floor(Math.random() * paletteColors.length);
          }

          let color = paletteColors[colorIndex];

          await Canvas.setPixel(user, x, y, color.hex, false);

          SocketServer.instance.io.emit("pixel", {
            x,
            y,
            color: color.id,
          });
          res(undefined);
        })
      );
    }
  }

  await Promise.allSettled(promises);
  res.send("ok");
});

/**
 * Undo a square
 *
 * @header X-Audit
 * @body start.x number
 * @body start.y number
 * @body end.x number
 * @body end.y number
 */
app.put("/canvas/undo", async (req, res) => {
  if (
    typeof req.body?.start?.x !== "number" ||
    typeof req.body?.start?.y !== "number"
  ) {
    res
      .status(400)
      .json({ success: false, error: "start position is invalid" });
    return;
  }

  if (
    typeof req.body?.end?.x !== "number" ||
    typeof req.body?.end?.y !== "number"
  ) {
    res.status(400).json({ success: false, error: "end position is invalid" });
    return;
  }

  const user_sub =
    req.session.user!.user.username +
    "@" +
    req.session.user!.service.instance.hostname;
  const start_position: [x: number, y: number] = [
    req.body.start.x,
    req.body.start.y,
  ];
  const end_position: [x: number, y: number] = [req.body.end.x, req.body.end.y];

  const width = end_position[0] - start_position[0];
  const height = end_position[1] - start_position[1];

  const pixels = await Canvas.undoArea(start_position, end_position);
  const paletteColors = await prisma.paletteColor.findMany({});

  for (const pixel of pixels) {
    switch (pixel.status) {
      case "fulfilled": {
        const coveredPixel = pixel.value;

        SocketServer.instance.io.emit("pixel", {
          x: pixel.pixel.x,
          y: pixel.pixel.y,
          color: coveredPixel
            ? paletteColors.find((p) => p.hex === coveredPixel.color)?.id || -1
            : -1,
        });

        // TODO: this spams the log, it would be nicer if it combined
        LogMan.log("mod_rollback", user_sub, {
          x: pixel.pixel.x,
          y: pixel.pixel.y,
          hex: coveredPixel?.color,
        });
        break;
      }
      case "rejected":
        console.log("Failed to undo pixel", pixel);
        break;
    }
  }

  const user = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(user.sub)
    .doing("CANVAS_AREA_UNDO")
    .reason(req.header("X-Audit") || null)
    .withComment(
      `Area undo (${start_position.join(",")}) -> (${end_position.join(",")})`
    )
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Fill an area
 *
 * @header X-Audit
 * @body start.x number
 * @body start.y number
 * @body end.x number
 * @body end.y number
 * @body color number Palette color index
 */
app.put("/canvas/fill", async (req, res) => {
  if (
    typeof req.body?.start?.x !== "number" ||
    typeof req.body?.start?.y !== "number"
  ) {
    res
      .status(400)
      .json({ success: false, error: "start position is invalid" });
    return;
  }

  if (
    typeof req.body?.end?.x !== "number" ||
    typeof req.body?.end?.y !== "number"
  ) {
    res.status(400).json({ success: false, error: "end position is invalid" });
    return;
  }

  if (typeof req.body.color !== "number") {
    res.status(400).json({ success: false, error: "color is invalid" });
    return;
  }

  const user_sub =
    req.session.user!.user.username +
    "@" +
    req.session.user!.service.instance.hostname;
  const start_position: [x: number, y: number] = [
    req.body.start.x,
    req.body.start.y,
  ];
  const end_position: [x: number, y: number] = [req.body.end.x, req.body.end.y];
  const palette = await prisma.paletteColor.findFirst({
    where: { id: req.body.color },
  });

  if (!palette) {
    res.status(400).json({ success: false, error: "invalid color" });
    return;
  }

  const width = end_position[0] - start_position[0];
  const height = end_position[1] - start_position[1];
  const area = width * height;

  // if (area > 50 * 50) {
  //   res.status(400).json({ success: false, error: "Area too big" });
  //   return;
  // }

  await Canvas.fillArea(
    { sub: user_sub },
    start_position,
    end_position,
    palette.hex
  );

  SocketServer.instance.io.emit(
    "square",
    start_position,
    end_position,
    palette.id
  );

  const user = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(user.sub)
    .doing("CANVAS_FILL")
    .reason(req.header("X-Audit") || null)
    .withComment(
      `Filled (${start_position.join(",")}) -> (${end_position.join(",")}) with ${palette.hex}`
    )
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Get ip address info
 *
 * @query address IP address
 */
app.get("/ip", async (req, res) => {
  if (typeof req.query.address !== "string") {
    return res.status(400).json({ success: false, error: "missing ?address=" });
  }

  const ip: string = req.query.address;

  const results = await prisma.iPAddress.findMany({
    select: {
      userSub: true,
      createdAt: true,
      lastUsedAt: true,
    },
    where: {
      ip,
    },
  });

  res.json({ success: true, results });
});

/**
 * Get all of a user's IP addresses
 *
 * @param :sub User ID
 */
app.get("/user/:sub/ips", async (req, res) => {
  let user: User;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      Logger.error(`/user/${req.params.sub}/ips Error ` + (e as any)?.message);
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  const ips = await prisma.iPAddress.findMany({
    where: {
      userSub: user.sub,
    },
  });

  res.json({ success: true, ips });
});

/**
 * Create or ban a user
 *
 * @header X-Audit
 * @param :sub User sub claim
 * @body expiresAt string! ISO date time string
 * @body publicNote string?
 * @body privateNote string?
 */
app.put("/user/:sub/ban", async (req, res) => {
  let user: User;
  let expires: Date;
  let publicNote: string | undefined | null;
  let privateNote: string | undefined | null;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      Logger.error(`/user/${req.params.sub}/ban Error ` + (e as any)?.message);
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  if (typeof req.body.expiresAt !== "string") {
    res
      .status(400)
      .json({ success: false, error: "expiresAt is not a string" });
    return;
  }

  expires = new Date(req.body.expiresAt);

  if (!isFinite(expires.getTime())) {
    res
      .status(400)
      .json({ success: false, error: "expiresAt is not a valid date" });
    return;
  }

  if (typeof req.body.publicNote !== "undefined") {
    if (
      typeof req.body.publicNote !== "string" &&
      req.body.privateNote !== null
    ) {
      res.status(400).json({
        success: false,
        error: "publicNote is set and is not a string",
      });
      return;
    }

    publicNote = req.body.publicNote;
  }

  if (typeof req.body.privateNote !== "undefined") {
    if (
      typeof req.body.privateNote !== "string" &&
      req.body.privateNote !== null
    ) {
      res.status(400).json({
        success: false,
        error: "privateNote is set and is not a string",
      });
      return;
    }

    privateNote = req.body.privateNote;
  }

  const existingBan = user.getBan();
  const ban = await user.ban(expires, publicNote, privateNote);

  let shouldNotifyUser = false;

  if (existingBan) {
    if (existingBan.expires.getTime() !== ban.expiresAt.getTime()) {
      shouldNotifyUser = true;
    }
  } else {
    shouldNotifyUser = true;
  }

  if (shouldNotifyUser) {
    user.notify({
      is: "modal",
      action: "moderation",
      dismissable: true,
      message_key: "banned",
      metadata: {
        until: expires.toISOString(),
      },
    });
  }

  user.updateStanding();

  const adminUser = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(adminUser.sub)
    .doing(existingBan ? "BAN_UPDATE" : "BAN_CREATE")
    .reason(req.header("X-Audit") || null)
    .withComment(
      existingBan
        ? `Updated ban on ${user.sub}`
        : `Created a ban for ${user.sub}`
    )
    .withBan(ban)
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Delete a user ban
 *
 * @header X-Audit
 * @param :sub User sub
 */
app.delete("/user/:sub/ban", async (req, res) => {
  // delete ban ("unban")

  let user: User;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      Logger.error(`/user/${req.params.sub}/ban Error ` + (e as any)?.message);
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  try {
    await user.unban();
  } catch (e) {
    if (e instanceof UserNotBanned) {
      res.status(404).json({ success: false, error: "User is not banned" });
    } else {
      Logger.error(
        `/instance/${req.params.sub}/ban Error ` + (e as any)?.message
      );
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  user.notify({
    is: "modal",
    action: "moderation",
    dismissable: true,
    message_key: "unbanned",
    metadata: {},
  });

  await user.update(true);
  user.updateStanding();

  const adminUser = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(adminUser.sub)
    .doing("BAN_DELETE")
    .reason(req.header("X-Audit") || null)
    .withComment(`Deleted ban for ${user.sub}`)
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Send notice to every connected socket
 *
 * @body title string
 * @body body string?
 */
app.post("/user/all/notice", async (req, res) => {
  let title: string = req.body.title;

  if (typeof req.body.title !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "Title is not a string" });
  }

  if (
    typeof req.body.body !== "undefined" &&
    typeof req.body.body !== "string"
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Body is set but is not a string" });
  }

  const sockets = await SocketServer.instance.io.fetchSockets();

  for (const socket of sockets) {
    socket.emit("alert", {
      is: "modal",
      action: "moderation",
      dismissable: true,
      title,
      body: req.body.body,
    });
  }

  res.json({ success: true });
});

/**
 * Send notice to user
 *
 * @param :sub User id
 * @body title string
 * @body body string?
 */
app.post("/user/:sub/notice", async (req, res) => {
  let user: User;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      Logger.error(`/user/${req.params.sub}/ban Error ` + (e as any)?.message);
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  let title: string = req.body.title;

  if (typeof req.body.title !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "Title is not a string" });
  }

  if (
    typeof req.body.body !== "undefined" &&
    typeof req.body.body !== "string"
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Body is set but is not a string" });
  }

  user.notify({
    is: "modal",
    action: "moderation",
    dismissable: true,
    title,
    body: req.body.body,
  });

  res.json({ success: true });
});

/**
 * Mark a user as a moderator
 *
 * @param :sub User ID
 */
app.put("/user/:sub/moderator", async (req, res) => {
  let user: User;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  await prisma.user.update({
    where: { sub: user.sub },
    data: {
      isModerator: true,
    },
  });

  await user.update(true);

  const adminUser = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(adminUser.sub)
    .doing("USER_MOD")
    .reason(req.header("X-Audit") || null)
    .withComment(`Made ${user.sub} a moderator`)
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Unmark a user as a moderator
 *
 * @param :sub User ID
 */
app.delete("/user/:sub/moderator", async (req, res) => {
  let user: User;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  await prisma.user.update({
    where: { sub: user.sub },
    data: {
      isModerator: false,
    },
  });

  await user.update(true);

  const adminUser = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(adminUser.sub)
    .doing("USER_UNMOD")
    .reason(req.header("X-Audit") || null)
    .withComment(`Removed ${user.sub} as moderator`)
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Mark a user as an admin
 *
 * @param :sub User ID
 */
app.put("/user/:sub/admin", async (req, res) => {
  let user: User;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  await prisma.user.update({
    where: { sub: user.sub },
    data: {
      isAdmin: true,
    },
  });

  await user.update(true);

  const adminUser = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(adminUser.sub)
    .doing("USER_ADMIN")
    .reason(req.header("X-Audit") || null)
    .withComment(`Added ${user.sub} as admin`)
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Unmark a user as an admin
 *
 * @param :sub User ID
 */
app.delete("/user/:sub/admin", async (req, res) => {
  let user: User;

  try {
    user = await User.fromSub(req.params.sub);
  } catch (e) {
    if (e instanceof UserNotFound) {
      res.status(404).json({ success: false, error: "User not found" });
    } else {
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  await prisma.user.update({
    where: { sub: user.sub },
    data: {
      isAdmin: false,
    },
  });

  await user.update(true);

  const adminUser = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(adminUser.sub)
    .doing("USER_UNADMIN")
    .reason(req.header("X-Audit") || null)
    .withComment(`Removed ${user.sub} as admin`)
    .create();

  res.json({ success: true, auditLog });
});

app.get("/instance/:domain/ban", async (req, res) => {
  // get ban information

  let instance: Instance;

  try {
    instance = await Instance.fromDomain(req.params.domain);
  } catch (e) {
    if (e instanceof InstanceNotFound) {
      res.status(404).json({ success: false, error: "instance not found" });
    } else {
      Logger.error(
        `/instance/${req.params.domain}/ban Error ` + (e as any)?.message
      );
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  const ban = await instance.getEffectiveBan();

  if (!ban) {
    return res
      .status(404)
      .json({ success: false, error: "Instance not banned" });
  }

  res.json({ success: true, ban });
});

/**
 * Create or update a ban for an instance (and subdomains)
 *
 * @header X-Audit
 * @param :domain Domain for the instance
 * @body expiresAt string! ISO date time string
 * @body publicNote string?
 * @body privateNote string?
 */
app.put("/instance/:domain/ban", async (req, res) => {
  // ban domain & subdomains

  let instance: Instance;
  let expires: Date;
  let publicNote: string | null | undefined;
  let privateNote: string | null | undefined;

  try {
    instance = await Instance.fromDomain(req.params.domain);
  } catch (e) {
    if (e instanceof InstanceNotFound) {
      res.status(404).json({ success: false, error: "instance not found" });
    } else {
      Logger.error(
        `/instance/${req.params.domain}/ban Error ` + (e as any)?.message
      );
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  if (typeof req.body.expiresAt !== "string") {
    res
      .status(400)
      .json({ success: false, error: "expiresAt is not a string" });
    return;
  }

  expires = new Date(req.body.expiresAt);

  if (!isFinite(expires.getTime())) {
    res
      .status(400)
      .json({ success: false, error: "expiresAt is not a valid date" });
    return;
  }

  if (typeof req.body.publicNote !== "undefined") {
    if (
      typeof req.body.publicNote !== "string" &&
      req.body.privateNote !== null
    ) {
      res.status(400).json({
        success: false,
        error: "publicNote is set and is not a string",
      });
      return;
    }

    publicNote = req.body.publicNote;
  }

  if (typeof req.body.privateNote !== "undefined") {
    if (
      typeof req.body.privateNote !== "string" &&
      req.body.privateNote !== null
    ) {
      res.status(400).json({
        success: false,
        error: "privateNote is set and is not a string",
      });
      return;
    }

    privateNote = req.body.privateNote;
  }

  const hasExistingBan = await instance.getBan();

  const user = (await User.fromAuthSession(req.session.user!))!;
  const ban = await instance.ban(expires, publicNote, privateNote);
  const auditLog = await AuditLog.Factory(user.sub)
    .doing(hasExistingBan ? "BAN_UPDATE" : "BAN_CREATE")
    .reason(req.header("X-Audit") || null)
    .withComment(
      hasExistingBan
        ? `Updated ban for ${instance.hostname}`
        : `Created a ban for ${instance.hostname}`
    )
    .withBan(ban)
    .create();

  res.json({
    success: true,
    ban,
    auditLog,
  });
});

/**
 * Delete an instance ban
 *
 * @header X-Audit
 * @param :domain The instance domain
 */
app.delete("/instance/:domain/ban", async (req, res) => {
  // unban domain & subdomains

  let instance: Instance;

  try {
    instance = await Instance.fromDomain(req.params.domain);
  } catch (e) {
    if (e instanceof InstanceNotFound) {
      res.status(404).json({ success: false, error: "instance not found" });
    } else {
      Logger.error(
        `/instance/${req.params.domain}/ban Error ` + (e as any)?.message
      );
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  let ban;
  try {
    ban = await instance.unban();
  } catch (e) {
    if (e instanceof InstanceNotBanned) {
      res.status(404).json({ success: false, error: "instance not banned" });
    } else {
      Logger.error(
        `/instance/${req.params.domain}/ban Error ` + (e as any)?.message
      );
      res.status(500).json({ success: false, error: "Internal error" });
    }
    return;
  }

  const user = (await User.fromAuthSession(req.session.user!))!;
  const auditLog = await AuditLog.Factory(user.sub)
    .doing("BAN_DELETE")
    .reason(req.header("X-Audit") || null)
    .withComment(`Deleted ban for ${instance.hostname}`)
    .create();

  res.json({ success: true, auditLog });
});

/**
 * Get all audit logs
 *
 * TODO: pagination
 */
app.get("/audit", async (req, res) => {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  res.json({ success: true, auditLogs });
});

/**
 * Get audit log entry by ID
 *
 * @param :id Audit log ID
 */
app.get("/audit/:id", async (req, res) => {
  let id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res
      .status(400)
      .json({ success: false, error: "id is not a number" });
  }

  const auditLog = await prisma.auditLog.findFirst({ where: { id } });

  if (!auditLog) {
    return res
      .status(404)
      .json({ success: false, error: "Audit log not found" });
  }

  res.json({ success: true, auditLog });
});

/**
 * Update audit log reason
 *
 * @param :id Audit log id
 * @body reason string|null
 */
app.put("/audit/:id/reason", async (req, res) => {
  let id = parseInt(req.params.id);
  let reason: string;

  if (isNaN(id)) {
    return res
      .status(400)
      .json({ success: false, error: "id is not a number" });
  }

  if (typeof req.body.reason !== "string" && req.body.reason !== null) {
    return res
      .status(400)
      .json({ success: false, error: "reason is not a string or null" });
  }

  reason = req.body.reason;

  const auditLog = await prisma.auditLog.findFirst({
    where: {
      id,
    },
  });

  if (!auditLog) {
    return res
      .status(404)
      .json({ success: false, error: "audit log is not found" });
  }

  const newAudit = await prisma.auditLog.update({
    where: { id },
    data: {
      reason,
      updatedAt: new Date(),
    },
  });

  res.json({
    success: true,
    auditLog: newAudit,
  });
});

export default app;
