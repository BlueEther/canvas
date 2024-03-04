import { Router } from "express";
import { prisma } from "./lib/prisma";

const app = Router();

const AUTH_ENDPOINT = "https://auth.fediverse.events";
const AUTH_CLIENT = "canvas";
const AUTH_SECRET = "secret";

app.get("/me", (req, res) => {
  res.json(req.session);
});

app.get("/login", (req, res) => {
  const params = new URLSearchParams();
  params.set("service", "canvas");

  res.redirect(AUTH_ENDPOINT + "/login?" + params);
});

app.get("/callback", async (req, res) => {
  const { code } = req.query;

  const who = await fetch(AUTH_ENDPOINT + "/api/auth/identify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_CLIENT}:${AUTH_SECRET}`,
    },
    body: JSON.stringify({
      code,
    }),
  }).then((a) => a.json());

  const [username, hostname] = who.user.sub.split("@");

  await prisma.user.upsert({
    where: {
      sub: [username, hostname].join("@"),
    },
    update: {},
    create: {
      sub: [username, hostname].join("@"),
    },
  });

  req.session.user = {
    service: {
      ...who.service,
      instance: {
        ...who.service.instance,
        hostname,
      },
    },
    user: {
      profile: who.user.profile,
      username,
    },
  };
  req.session.save();
  res.redirect("/");
});

export default app;
