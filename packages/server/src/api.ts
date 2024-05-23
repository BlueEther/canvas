import { Router } from "express";
import { prisma } from "./lib/prisma";
import { OpenID } from "./lib/oidc";

const app = Router();

app.get("/me", (req, res) => {
  res.json(req.session);
});

app.get("/login", (req, res) => {
  res.redirect(
    OpenID.client.authorizationUrl({
      prompt: "consent",
      scope: "openid instance",
    })
  );
});

// TODO: logout endpoint

app.get("/callback", async (req, res) => {
  // const { code } = req.query;

  const params = OpenID.client.callbackParams(req);
  const exchange = await OpenID.client.callback(
    OpenID.getRedirectUrl(),
    params
  );
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

export default app;
