import EventEmitter from "eventemitter3";
import { ClientConfig, IPosition, Pixel } from "@sc07-canvas/lib/src/net";
import Network from "./network";
import {
  ClickEvent,
  HoverEvent,
  PanZoom,
} from "@sc07-canvas/lib/src/renderer/PanZoom";
import { toast } from "react-toastify";
import { KeybindManager } from "./keybinds";
import { getRenderer } from "./utils";
import { CanvasPixel } from "./canvasRenderer";

interface CanvasEvents {
  /**
   * Cursor canvas position
   * (-1, -1) is not on canvas
   * @param position Canvas position
   * @returns
   */
  cursorPos: (position: IPosition) => void;
  canvasReady: () => void;
}

export class Canvas extends EventEmitter<CanvasEvents> {
  static instance: Canvas | undefined;

  private config: ClientConfig = {} as any;
  private canvas: HTMLCanvasElement;
  private PanZoom: PanZoom;

  private cursor: { x: number; y: number; color?: number } = { x: -1, y: -1 };
  private pixels: {
    [x_y: string]: { color: number; type: "full" | "pending" };
  } = {};
  lastPlace: number | undefined;

  private bypassCooldown = false;
  private _delayedLoad: ReturnType<typeof setTimeout>;

  constructor(canvas: HTMLCanvasElement, PanZoom: PanZoom) {
    super();
    Canvas.instance = this;
    getRenderer().startRender();

    getRenderer().on("ready", () => this.emit("canvasReady"));

    this.canvas = canvas;
    this.PanZoom = PanZoom;
    this._delayedLoad = setTimeout(() => this.delayedLoad(), 1000);

    this.PanZoom.addListener("hover", this.handleMouseMove.bind(this));
    this.PanZoom.addListener("click", this.handleMouseDown.bind(this));
    this.PanZoom.addListener("longPress", this.handleLongPress);

    Network.waitFor("pixelLastPlaced").then(
      ([time]) => (this.lastPlace = time)
    );
    Network.on("pixel", this.handlePixel);
    Network.on("square", this.handleSquare);
  }

  destroy() {
    getRenderer().stopRender();
    getRenderer().off("ready");
    if (this._delayedLoad) clearTimeout(this._delayedLoad);

    this.PanZoom.removeListener("hover", this.handleMouseMove.bind(this));
    this.PanZoom.removeListener("click", this.handleMouseDown.bind(this));
    this.PanZoom.removeListener("longPress", this.handleLongPress);

    Network.off("pixel", this.handlePixel);
    Network.off("square", this.handleSquare);
  }

  /**
   * React.Strict remounts the main component, causing a quick remount, which then causes errors related to webworkers
   */
  delayedLoad() {
    getRenderer().useCanvas(this.canvas, "main");
  }

  setSize(width: number, height: number) {
    getRenderer().setSize(width, height);
  }

  loadConfig(config: ClientConfig) {
    this.config = config;

    this.setSize(config.canvas.size[0], config.canvas.size[1]);

    // we want the new one if possible
    // (this might cause a timing issue though)
    // if we don't clear the old one, if the canvas gets resized we get weird stretching
    if (Object.keys(this.pixels).length > 0) Network.clearPrevious("canvas");

    Network.waitFor("canvas").then(([pixels]) => {
      console.log("loadConfig just received new canvas data");
      this.handleBatch(pixels);
    });
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

  getPixel(x: number, y: number): { color: number } | undefined {
    return this.pixels[x + "_" + y];
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

  handleSquare = (
    start: [x: number, y: number],
    end: [x: number, y: number],
    color: number
  ) => {
    const palette = this.Pallete.getColor(color);
    let serializeBuild: CanvasPixel[] = [];

    for (let x = start[0]; x <= end[0]; x++) {
      for (let y = start[1]; y <= end[1]; y++) {
        // we still store a copy of the pixels in this instance for non-rendering functions
        this.pixels[x + "_" + y] = {
          type: "full",
          color: palette?.id || -1,
        };

        serializeBuild.push({
          x,
          y,
          hex:
            !palette || palette?.hex === "transparent" ? "null" : palette.hex,
        });
      }
    }

    getRenderer().usePixels(serializeBuild);
  };

  handleBatch = (pixels: string[]) => {
    if (!this.config.canvas) {
      throw new Error("handleBatch called with no config");
    }

    let serializeBuild: CanvasPixel[] = [];

    for (let x = 0; x < this.config.canvas.size[0]; x++) {
      for (let y = 0; y < this.config.canvas.size[1]; y++) {
        const hex = pixels[this.config.canvas.size[0] * y + x];
        const palette = this.Pallete.getColorFromHex(hex);

        // we still store a copy of the pixels in this instance for non-rendering functions
        this.pixels[x + "_" + y] = {
          type: "full",
          color: palette?.id || -1,
        };

        serializeBuild.push({
          x,
          y,
          hex: hex === "transparent" ? "null" : hex,
        });
      }
    }

    getRenderer().usePixels(serializeBuild, true);
  };

  handlePixel = ({ x, y, color }: Pixel) => {
    // we still store a copy of the pixels in this instance for non-rendering functions
    this.pixels[x + "_" + y] = {
      type: "full",
      color,
    };

    const palette = this.Pallete.getColor(color);

    getRenderer().usePixel({ x, y, hex: palette?.hex || "null" });
  };

  Pallete = {
    getColor: (colorId: number) => {
      return this.config.pallete.colors.find((c) => c.id === colorId);
    },

    getSelectedColor: () => {
      if (!this.cursor.color) return undefined;

      return this.Pallete.getColor(this.cursor.color);
    },

    getColorFromHex: (hex: string) => {
      return this.config.pallete.colors.find((c) => c.hex === hex);
    },
  };

  /**
   * Changes the cursor color as tracked by the Canvas instance
   *
   * @see Toolbar/Palette.tsx
   * @param color
   */
  updateCursor(color?: number) {
    this.cursor.color = color;
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
}
