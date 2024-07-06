import { Router } from "express";
import { prisma } from "../lib/prisma";
import { OpenID } from "../lib/oidc";
import { TokenSet, errors as OIDC_Errors } from "openid-client";
import { getLogger } from "../lib/Logger";
import Canvas from "../lib/Canvas";
import { RateLimiter } from "../lib/RateLimiter";
import { Instance } from "../models/Instance";

const Logger = getLogger("HTTP/CLIENT");

const ClientParams = {
  TYPE: "auth_type",
  ERROR: "auth_error",
  ERROR_DESC: "auth_error_desc",
  CAN_RETRY: "auth_retry",
};

const buildQuery = (obj: { [k in keyof typeof ClientParams]?: string }) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    const k_: keyof typeof ClientParams = k as any;
    params.set(ClientParams[k_], v);
  }
  return "?" + params.toString();
};

const app = Router();

/**
 * Redirect to actual authorization page
 */
app.get("/login", (req, res) => {
  if (process.env.INHIBIT_LOGINS) {
    res.status(400).json({
      success: false,
      error: "Login is not permitted.",
    });
    return;
  }

  res.redirect(
    OpenID.client.authorizationUrl({
      prompt: "consent",
      scope: "openid instance",
    })
  );
});

app.get("/logout", (req, res) => {
  res.send(
    `<form method="post"><input type="submit" value="Confirm Logout" /></form>`
  );
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/**
 * Process token exchange from openid server
 *
 * This executes multiple database queries and should be ratelimited
 */
app.get("/callback", RateLimiter.HIGH, async (req, res) => {
  if (process.env.INHIBIT_LOGINS) {
    res.status(400).json({
      success: false,
      error: "Login is not permitted.",
    });
    return;
  }

  let exchange: TokenSet;

  try {
    const params = OpenID.client.callbackParams(req);
    exchange = await OpenID.client.callback(OpenID.getRedirectUrl(), params);
  } catch (e) {
    if (e instanceof OIDC_Errors.RPError) {
      // client error

      res.redirect(
        "/" +
          buildQuery({
            TYPE: "rp",
            ERROR: e.name,
            ERROR_DESC: e.message,
          })
      );
      return;
    }

    if (e instanceof OIDC_Errors.OPError) {
      // server error

      switch (e.error) {
        case "invalid_client":
          // this happens when we're configured with invalid credentials
          Logger.error(
            "OpenID is improperly configured. Cannot exchange tokens, do I have valid credetials?"
          );
          res.redirect(
            "/" +
              buildQuery({
                TYPE: "op",
                ERROR: "Internal Server Error",
                ERROR_DESC: "I'm misconfigured.",
              })
          );
          return;
        case "invalid_grant":
          res.redirect(
            "/" +
              buildQuery({
                TYPE: "op",
                ERROR: "invalid_grant",
                CAN_RETRY: "true",
              })
          );
          return;
      }

      res.redirect(
        "/" +
          buildQuery({
            TYPE: "op",
            ERROR: e.error,
            ERROR_DESC: e.error_description,
          })
      );
      return;
    }

    res.redirect(
      "/" +
        buildQuery({
          TYPE: "op",
          ERROR: "unknown error",
          ERROR_DESC: "report this",
        })
    );
    return;
  }

  if (!exchange || !exchange.access_token) {
    return res.status(400).json({
      success: false,
      error: "FAILED TOKEN EXCHANGE",
    });
  }

  const whoami = await OpenID.client.userinfo<{
    instance: {
      software: {
        name: string;
        version: string;
        logo_uri?: string;
        repository?: string;
        homepage?: string;
      };
      instance: {
        logo_uri?: string;
        banner_uri?: string;
        name?: string;
      };
    };
  }>(exchange.access_token);

  const [username, hostname] = whoami.sub.split("@");

  const instance = await Instance.fromAuth(hostname, whoami.instance.instance);
  const instanceBan = await instance.getEffectiveBan();
  if (instanceBan) {
    res.redirect(
      "/" +
        buildQuery({
          TYPE: "banned",
          ERROR_DESC: instanceBan.publicNote || undefined,
        })
    );
    return;
  }

  const sub = [username, hostname].join("@");
  await prisma.user.upsert({
    where: {
      sub,
    },
    update: {
      sub,
      display_name: whoami.name,
      picture_url: whoami.picture,
      profile_url: whoami.profile,
    },
    create: {
      sub,
      display_name: whoami.name,
      picture_url: whoami.picture,
      profile_url: whoami.profile,
    },
  });

  req.session.user = {
    service: {
      ...whoami.instance,
      instance: {
        ...whoami.instance.instance,
        hostname,
      },
    },
    user: {
      picture_url: whoami.picture,
      username,
    },
  };
  req.session.save();
  res.redirect("/");
});

app.get("/canvas/pixel/:x/:y", RateLimiter.HIGH, async (req, res) => {
  const x = parseInt(req.params.x);
  const y = parseInt(req.params.y);

  if (isNaN(x) || isNaN(y)) {
    return res
      .status(400)
      .json({ success: false, error: "x or y is not a number" });
  }

  const pixel = await Canvas.getPixel(x, y);
  if (!pixel) {
    return res.json({ success: false, error: "no_pixel" });
  }

  const otherPixels = await prisma.pixel.count({ where: { x, y } });

  const user = await prisma.user.findFirst({ where: { sub: pixel.userId } });
  const instance = await prisma.instance.findFirst({
    where: { hostname: pixel.userId.split("@")[1] },
  });

  res.json({
    success: true,
    pixel,
    otherPixels: otherPixels - 1,
    user: user && {
      sub: user.sub,
      display_name: user.display_name,
      picture_url: user.picture_url,
      profile_url: user.profile_url,
      isAdmin: user.isAdmin,
      isModerator: user.isModerator,
    },
    instance: instance && {
      hostname: instance.hostname,
      name: instance.name,
      logo_url: instance.logo_url,
      banner_url: instance.banner_url,
    },
  });
});

/**
 * Get the heatmap
 *
 * This is cached, so no need to ratelimit this
 * Even if the heatmap isn't ready, this doesn't cause the heatmap to get generated
 */
app.get("/heatmap", async (req, res) => {
  const heatmap = await Canvas.getCachedHeatmap();

  if (!heatmap) {
    return res.json({ success: false, error: "heatmap_not_generated" });
  }

  res.json({ success: true, heatmap });
});

/**
 * Get user information from the sub (grant@toast.ooo)
 *
 * This causes a database query, so ratelimit it
 */
app.get("/user/:sub", RateLimiter.HIGH, async (req, res) => {
  const user = await prisma.user.findFirst({ where: { sub: req.params.sub } });
  if (!user) {
    return res.status(404).json({ success: false, error: "unknown_user" });
  }

  res.json({
    success: true,
    user: {
      sub: user.sub,
      display_name: user.display_name,
      picture_url: user.picture_url,
      profile_url: user.profile_url,
      isAdmin: user.isAdmin,
      isModerator: user.isModerator,
    },
  });
});

export default app;
