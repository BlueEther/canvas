import { SUserPacket, AuthSession } from "@sc07-canvas/lib/src/net";

const $puseroverlay = document.querySelector(
  "#pallete .pallete-user-overlay"
)! as HTMLDivElement;
const $usercard = document.querySelector(".user-card")! as HTMLDivElement;
const $usercard_name = $usercard.querySelector(".user-name")! as HTMLDivElement;
const $usercard_instance = $usercard.querySelector(
  ".user-instance"
)! as HTMLDivElement;
const $usercard_avatar = $usercard.querySelector(
  "img.user-avatar"
)! as HTMLImageElement;

class Auth {
  private user: AuthSession | undefined;

  login() {
    window.location.href = "/api/login";
  }

  handleAuth(data: SUserPacket) {
    this.user = data.user;
    $puseroverlay.style.display = "none";

    $usercard_name.innerText = data.user.user.username;
    $usercard_instance.innerHTML = data.user.service.instance.hostname;
    $usercard_avatar.setAttribute("src", data.user.user.profile);
  }
}

export default new Auth();
