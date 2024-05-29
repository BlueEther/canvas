import { Router } from "express";
import { prisma } from "../lib/prisma";
import { OpenID } from "../lib/oidc";
import { TokenSet, errors as OIDC_Errors } from "openid-client";
import { Logger } from "../lib/Logger";

const app = Router();

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
  // TODO: return proper UIs for errors intead of raw JSON (#35)
  // const { code } = req.query;

  let exchange: TokenSet;

  try {
    const params = OpenID.client.callbackParams(req);
    exchange = await OpenID.client.callback(OpenID.getRedirectUrl(), params);
  } catch (e) {
    if (e instanceof OIDC_Errors.RPError) {
      // client error

      res.status(400).json({
        success: false,
        error: e.name,
        error_description: e.message,
      });
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
          res.status(500).json({
            success: false,
            error: "internal server error",
            error_description: "I'm misconfigured.",
          });
          return;
        case "invalid_grant":
          res.status(400).json({
            success: false,
            error: "invalid_grant",
            error_description: "retry /api/login",
          });
          return;
      }

      res.status(400).json({
        success: false,
        error: e.error,
        error_description: e.error_description,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "unknown error",
      error_description: "report this",
    });
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
