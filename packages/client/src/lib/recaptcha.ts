class Recaptcha_ {
  load(site_key: string) {
    const script = document.createElement("script");
    script.setAttribute(
      "src",
      `https://www.google.com/recaptcha/api.js?render=explicit`
    );
    document.head.appendChild(script);

    script.onload = () => {
      grecaptcha.ready(() => {
        grecaptcha.render("grecaptcha-badge", {
          sitekey: site_key,
          badge: "inline",
          size: "invisible",
        });

        console.log("Google Recaptcha Loaded!");
      });
    };
  }

  executeChallenge(ack: (token: string) => void) {
    console.log("[Recaptcha] Received challenge request...");
    grecaptcha.execute().then((token) => {
      console.log("[Recaptcha] Sending challenge token back");
      ack(token as any);
    });
  }
}

export const Recaptcha = new Recaptcha_();
