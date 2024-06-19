import EventEmitter from "eventemitter3";
import {
  ClientConfig,
  IPaletteContext,
  IPosition,
  Pixel,
} from "@sc07-canvas/lib/src/net";
import Network from "./network";
import {
  ClickEvent,
  HoverEvent,
  PanZoom,
} from "@sc07-canvas/lib/src/renderer/PanZoom";
import { toast } from "react-toastify";
import { KeybindManager } from "./keybinds";

interface CanvasEvents {
  /**
   * Cursor canvas position
   * (-1, -1) is not on canvas
   * @param position Canvas position
   * @returns
   */
  cursorPos: (position: IPosition) => void;
}

export class Canvas extends EventEmitter<CanvasEvents> {
  static instance: Canvas | undefined;

  private _destroy = false;
  private config: ClientConfig = {} as any;
  private canvas: HTMLCanvasElement;
  private PanZoom: PanZoom;
  private ctx: CanvasRenderingContext2D;

  private cursor = { x: -1, y: -1 };
  private pixels: {
    [x_y: string]: { color: number; type: "full" | "pending" };
  } = {};
  lastPlace: number | undefined;

  private bypassCooldown = false;

  constructor(canvas: HTMLCanvasElement, PanZoom: PanZoom) {
    super();
    Canvas.instance = this;

    this.canvas = canvas;
    this.PanZoom = PanZoom;
    this.ctx = canvas.getContext("2d")!;

    this.PanZoom.addListener("hover", this.handleMouseMove.bind(this));
    this.PanZoom.addListener("click", this.handleMouseDown.bind(this));
    this.PanZoom.addListener("longPress", this.handleLongPress);

    Network.waitFor("pixelLastPlaced").then(
      ([time]) => (this.lastPlace = time)
    );
    Network.on("pixel", this.handlePixel);
  }

  destroy() {
    this._destroy = true;

    this.PanZoom.removeListener("hover", this.handleMouseMove.bind(this));
    this.PanZoom.removeListener("click", this.handleMouseDown.bind(this));
    this.PanZoom.removeListener("longPress", this.handleLongPress);

    Network.off("pixel", this.handlePixel);
  }

  loadConfig(config: ClientConfig) {
    this.config = config;

    this.canvas.width = config.canvas.size[0];
    this.canvas.height = config.canvas.size[1];

    // we want the new one if possible
    // (this might cause a timing issue though)
    // if we don't clear the old one, if the canvas gets resized we get weird stretching
    if (Object.keys(this.pixels).length > 0) Network.clearPrevious("canvas");

    Network.waitFor("canvas").then(([pixels]) => {
      console.log("loadConfig just received new canvas data");
      this.handleBatch(pixels);
      this.draw();
    });

    this.draw();
  }

  hasConfig() {
    return !!this.config;
  }

  getConfig() {
    return this.config;
  }

  getPanZoom() {
    return this.PanZoom;
  }

  setCooldownBypass(value: boolean) {
    this.bypassCooldown = value;
  }

  getCooldownBypass() {
    return this.bypassCooldown;
  }

  getAllPixels() {
    let pixels: {
      x: number;
      y: number;
      color: number;
    }[] = [];

    for (const [x_y, value] of Object.entries(this.pixels)) {
      if (value.type === "pending") continue;

      const [x, y] = x_y.split("_").map((v) => parseInt(v));
      pixels.push({
        x,
        y,
        color: value.color,
      });
    }

    return pixels;
  }

  /**
   * Get nearby pixels
   * @param x
   * @param y
   * @param around (x,y) +- around
   */
  getSurroundingPixels(x: number, y: number, around: number = 3) {
    let pixels = [];

    for (let offsetY = 0; offsetY <= around + 1; offsetY++) {
      let arr = [];
      for (let offsetX = 0; offsetX <= around + 1; offsetX++) {
        let targetX = x + (offsetX - around + 1);
        let targetY = y + (offsetY - around + 1);
        let pixel = this.pixels[targetX + "_" + targetY];

        if (pixel) {
          arr.push("#" + (this.Pallete.getColor(pixel.color)?.hex || "ffffff"));
        } else {
          arr.push("transparent");
        }
      }
      pixels.push(arr);
    }

    return pixels;
  }

  handleLongPress = (clientX: number, clientY: number) => {
    KeybindManager.handleInteraction(
      {
        key: "LONG_PRESS",
      },
      {
        clientX,
        clientY,
      }
    );
  };

  handleMouseDown(e: ClickEvent) {
    if (!e.alt && !e.ctrl && !e.meta && !e.shift && e.button === "LCLICK") {
      const [x, y] = this.screenToPos(e.clientX, e.clientY);
      this.place(x, y);
    } else {
      // KeybindManager.handleInteraction({
      //   key: e.button,
      //   alt: e.alt,
      //   ctrl: e.ctrl,
      //   meta: e.meta,
      //   shift: e.meta
      // }, )
    }
  }

  handleMouseMove(e: HoverEvent) {
    const canvasRect = this.canvas.getBoundingClientRect();
    if (
      canvasRect.left <= e.clientX &&
      canvasRect.right >= e.clientX &&
      canvasRect.top <= e.clientY &&
      canvasRect.bottom >= e.clientY
    ) {
      const [x, y] = this.screenToPos(e.clientX, e.clientY);
      this.cursor.x = x;
      this.cursor.y = y;
    } else {
      this.cursor.x = -1;
      this.cursor.y = -1;
    }

    this.emit("cursorPos", this.cursor);
  }

  handleBatch = (pixels: string[]) => {
    if (!this.config.canvas) {
      throw new Error("handleBatch called with no config");
    }

    for (let x = 0; x < this.config.canvas.size[0]; x++) {
      for (let y = 0; y < this.config.canvas.size[1]; y++) {
        const hex = pixels[this.config.canvas.size[0] * y + x];
        const color = this.Pallete.getColorFromHex(hex);

        this.pixels[x + "_" + y] = {
          color: color ? color.id : -1,
          type: "full",
        };
      }
    }
  };

  handlePixel = ({ x, y, color }: Pixel) => {
    this.pixels[x + "_" + y] = {
      color,
      type: "full",
    };
  };

  palleteCtx: IPaletteContext = {};
  Pallete = {
    getColor: (colorId: number) => {
      return this.config.pallete.colors.find((c) => c.id === colorId);
    },

    getSelectedColor: () => {
      if (!this.palleteCtx.color) return undefined;

      return this.Pallete.getColor(this.palleteCtx.color);
    },

    getColorFromHex: (hex: string) => {
      return this.config.pallete.colors.find((c) => c.hex === hex);
    },
  };

  updatePallete(pallete: IPaletteContext) {
    this.palleteCtx = pallete;
  }

  place(x: number, y: number) {
    if (!this.Pallete.getSelectedColor()) return;

    // TODO: redo this as the server now verifies placements differently
    // if (this.lastPlace) {
    //   if (this.lastPlace + this.config.pallete.pixel_cooldown > Date.now()) {
    //     console.log("cannot place; cooldown");
    //     return;
    //   }
    // }

    Network.socket
      .emitWithAck(
        "place",
        {
          x,
          y,
          color: this.Pallete.getSelectedColor()!.id,
        },
        this.bypassCooldown
      )
      .then((ack) => {
        if (ack.success) {
          this.lastPlace = Date.now();
          this.handlePixel(ack.data);
        } else {
          console.warn(
            "Attempted to place pixel",
            { x, y, color: this.Pallete.getSelectedColor()!.id },
            "and got error",
            ack
          );

          switch (ack.error) {
            case "invalid_pixel":
              toast.error(
                "Cannot place, invalid pixel location. Are you even on the canvas?"
              );
              break;
            case "no_user":
              toast.error("You are not logged in.");
              break;
            case "palette_color_invalid":
              toast.error("This isn't a color that you can use...?");
              break;
            case "pixel_cooldown":
              toast.error("You're on pixel cooldown, cannot place");
              break;
            case "you_already_placed_that":
              toast.error("You already placed this color at this location");
              break;
            default:
              toast.error("Error while placing pixel: " + ack.error);
          }
        }
      });
  }

  canvasToPanZoomTransform(x: number, y: number) {
    let transformX = 0;
    let transformY = 0;

    if (this.PanZoom.flags.useZoom) {
      // CSS Zoom does not alter this (obviously)
      transformX = this.canvas.width / 2 - x;
      transformY = this.canvas.height / 2 - y;
    } else {
      transformX = this.canvas.width / 2 - x;
      transformY = this.canvas.height / 2 - y;
    }

    return { transformX, transformY };
  }

  panZoomTransformToCanvas() {
    const { x, y, scale: zoom } = this.PanZoom.transform;
    const rect = this.canvas.getBoundingClientRect();

    let canvasX = 0;
    let canvasY = 0;

    if (this.PanZoom.flags.useZoom) {
      // css zoom doesn't change the bounding client rect
      // therefore dividing by zoom doesn't return the correct output
      canvasX = this.canvas.width - (x + rect.width / 2);
      canvasY = this.canvas.height - (y + rect.height / 2);
    } else {
      canvasX = this.canvas.width / 2 - (x + rect.width / zoom);
      canvasY = this.canvas.height / 2 - (y + rect.height / zoom);

      canvasX += this.canvas.width;
      canvasY += this.canvas.height;
    }

    canvasX >>= 0;
    canvasY >>= 0;

    return { canvasX, canvasY };
  }

  debug(x: number, y: number, id?: string) {
    if (document.getElementById("debug-" + id)) {
      document.getElementById("debug-" + id)!.style.top = y + "px";
      document.getElementById("debug-" + id)!.style.left = x + "px";
      return;
    }
    let el = document.createElement("div");
    if (id) el.id = "debug-" + id;
    el.classList.add("debug-point");
    el.style.setProperty("top", y + "px");
    el.style.setProperty("left", x + "px");
    document.body.appendChild(el);
  }

  /**
   * Screen (clientX, clientY) to Canvas position
   * @param x
   * @param y
   * @returns
   */
  screenToPos(x: number, y: number) {
    // the rendered dimentions in the browser
    const rect = this.canvas.getBoundingClientRect();

    let output = {
      x: 0,
      y: 0,
    };

    if (this.PanZoom.flags.useZoom) {
      const scale = this.PanZoom.transform.scale;

      output.x = x / scale - rect.left;
      output.y = y / scale - rect.top;
    } else {
      // get the ratio
      const scale = [
        this.canvas.width / rect.width,
        this.canvas.height / rect.height,
      ];

      output.x = (x - rect.left) * scale[0];
      output.y = (y - rect.top) * scale[1];
    }

    // floor it, we're getting canvas coords, which can't have decimals
    output.x >>= 0;
    output.y >>= 0;

    return [output.x, output.y];
  }

  draw() {
    this.ctx.imageSmoothingEnabled = false;

    const bezier = (n: number) => n * n * (3 - 2 * n);

    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(
      0,
      0,
      this.config.canvas.size[0],
      this.config.canvas.size[1]
    );

    for (const [x_y, pixel] of Object.entries(this.pixels)) {
      const [x, y] = x_y.split("_").map((a) => parseInt(a));

      this.ctx.globalAlpha = pixel.type === "full" ? 1 : 0.5;
      this.ctx.fillStyle =
        pixel.color > -1
          ? "#" + this.Pallete.getColor(pixel.color)!.hex
          : "transparent";
      this.ctx.fillRect(x, y, 1, 1);
    }

    if (this.palleteCtx.color && this.cursor.x > -1 && this.cursor.y > -1) {
      const color = this.config.pallete.colors.find(
        (c) => c.id === this.palleteCtx.color
      );

      let t = ((Date.now() / 100) % 10) / 10;
      this.ctx.globalAlpha = t < 0.5 ? bezier(t) : -bezier(t) + 1;
      this.ctx.fillStyle = "#" + color!.hex;
      this.ctx.fillRect(this.cursor.x, this.cursor.y, 1, 1);
    }

    if (!this._destroy) window.requestAnimationFrame(() => this.draw());
  }
}
