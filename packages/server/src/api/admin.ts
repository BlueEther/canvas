import { Router } from "express";
import { User } from "../models/User";
import Canvas from "../lib/Canvas";
import { getLogger } from "../lib/Logger";
import { RateLimiter } from "../lib/RateLimiter";
import { prisma } from "../lib/prisma";
import { SocketServer } from "../lib/SocketServer";

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

  res.send({ success: true });
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
  if (
    typeof req.body?.width !== "number" ||
    typeof req.body?.height !== "number"
  ) {
    res.status(400).json({ success: false, error: "width/height is invalid" });
    return;
  }

  const width: number = req.body.width;
  const height: number = req.body.height;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let color = Math.floor(Math.random() * 30) + 1;
      SocketServer.instance.io.emit("pixel", {
        x,
        y,
        color,
      });
    }
  }

  res.send("ok");
});

/**
 * Fill an area
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

  res.json({ success: true });
});

export default app;
