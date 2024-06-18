import { Router } from "express";
import { User } from "../models/User";
import Canvas from "../lib/Canvas";
import { Logger } from "../lib/Logger";
import { RateLimiter } from "../lib/RateLimiter";

const app = Router();

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

export default app;
