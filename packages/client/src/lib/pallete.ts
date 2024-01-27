import { SUserPacket } from "@sc07-canvas/lib/src/net";

export type PalleteColor = {
  id: number;
  hex: string;
  name: string;
};

const $pallete = document.getElementById("pallete")!;
const $pcolors = $pallete.querySelector(".pallete-colors")!;
const $puseroverlay = $pallete.querySelector(
  ".pallete-user-overlay"
)! as HTMLDivElement;
const $cursor = document.getElementById("cursor")!;

class Pallete {
  private pallete: PalleteColor[] = [];
  private active: PalleteColor | undefined;
  private pixel_cooldown = 0;

  load({
    colors,
    pixel_cooldown,
  }: {
    colors: PalleteColor[];
    pixel_cooldown: number;
  }) {
    $pcolors.innerHTML = "";

    this.pallete = colors;
    this.pixel_cooldown = pixel_cooldown;

    colors.forEach((color) => {
      const $color = document.createElement("a");
      $color.href = "#";
      $color.classList.add("pallete-color");
      $color.style.backgroundColor = "#" + color.hex;
      $color.addEventListener("click", () => {
        this.pick(color);
      });
      $pcolors.append($color);
    });

    this.active = undefined;
  }

  pick(color?: PalleteColor) {
    this.active = color;

    $cursor.style.display = color ? "block" : "none";

    if (color) $cursor.style.backgroundColor = "#" + color.hex;
  }

  getColor() {
    return this.active;
  }

  getPallete() {
    return this.pallete;
  }

  getPalleteColor(id: number) {
    return this.pallete.find((p) => p.id === id);
  }

  getPalleteFromHex(hex: string) {
    return this.pallete.find((p) => p.hex === hex);
  }

  /**
   * Get pixel cooldown
   * @returns Pixel cooldown in ms
   */
  getPixelCooldown() {
    return this.pixel_cooldown;
  }
}

export default new Pallete();
