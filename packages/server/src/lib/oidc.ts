import { BaseClient, Issuer } from "openid-client";

class OpenID_ {
  issuer: Issuer<BaseClient> = {} as any;
  client: BaseClient = {} as any;

  async setup() {
    if (process.env.INHIBIT_LOGIN) {
      console.warn(
        "OpenID is not setup; INHIBIT_LOGIN environment variable set! Proceed with caution!"
      );
      return;
    }

    const { AUTH_ENDPOINT, AUTH_CLIENT, AUTH_SECRET } = process.env;

    this.issuer = await Issuer.discover(AUTH_ENDPOINT);
    this.client = new this.issuer.Client({
      client_id: AUTH_CLIENT,
      client_secret: AUTH_SECRET,
      response_types: ["code"],
      redirect_uris: [this.getRedirectUrl()],
    });
  }

  getRedirectUrl() {
    return process.env.OIDC_CALLBACK_HOST + "/api/callback";
  }
}

export const OpenID = new OpenID_();
