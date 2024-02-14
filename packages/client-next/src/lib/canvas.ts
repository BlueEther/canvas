import EventEmitter from "eventemitter3";
import { ClientConfig, IPalleteContext, Pixel } from "../types";
import Network from "./network";
import {
  ClickEvent,
  HoverEvent,
  PanZoom,
} from "@sc07-canvas/lib/src/renderer/PanZoom";

export class Canvas extends EventEmitter {
  static instance: Canvas | undefined;

  private _destroy = false;
  private config: ClientConfig;
  private canvas: HTMLCanvasElement;
  private PanZoom: PanZoom;
  private ctx: CanvasRenderingContext2D;

  private cursor = { x: -1, y: -1 };
  private pixels: {
    [x_y: string]: { color: number; type: "full" | "pending" };
  } = {};
  private lastPlace: number | undefined;

  constructor(
    config: ClientConfig,
    canvas: HTMLCanvasElement,
    PanZoom: PanZoom
  ) {
    super();
    Canvas.instance = this;

    this.config = config;
    this.canvas = canvas;
    this.PanZoom = PanZoom;
    this.ctx = canvas.getContext("2d")!;

    canvas.width = config.canvas.size[0];
    canvas.height = config.canvas.size[1];

    this.PanZoom.addListener("hover", this.handleMouseMove.bind(this));
    this.PanZoom.addListener("click", this.handleMouseDown.bind(this));

    this.on("pallete", this.updatePallete.bind(this));

    Network.waitFor("canvas").then(([pixels]) => this.handleBatch(pixels));

    this.draw();
  }

  destroy() {
    this._destroy = true;

    this.PanZoom.removeListener("hover", this.handleMouseMove.bind(this));
    this.PanZoom.removeListener("click", this.handleMouseDown.bind(this));

    Network.off("canvas", this.handleBatch.bind(this));
  }

  handleMouseDown(e: ClickEvent) {
    const [x, y] = this.screenToPos(e.clientX, e.clientY);
    this.place(x, y);
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
  }

  handleBatch(pixels: string[]) {
    pixels.forEach((hex, index) => {
      const x = index % this.config.canvas.size[0];
      const y = index / this.config.canvas.size[1];
      const color = this.Pallete.getColorFromHex(hex);

      this.pixels[x + "_" + y] = {
        color: color ? color.id : -1,
        type: "full",
      };
    });
  }

  handlePixel({ x, y, color, ...pixel }: Pixel) {
    this.pixels[x + "_" + y] = {
      color,
      type: "full",
    };
  }

  palleteCtx: IPalleteContext = {};
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

  updatePallete(pallete: IPalleteContext) {
    this.palleteCtx = pallete;
  }

  place(x: number, y: number) {
    if (!this.Pallete.getSelectedColor()) return;

    if (this.lastPlace) {
      if (this.lastPlace + this.config.pallete.pixel_cooldown > Date.now()) {
        console.log("cannot place; cooldown");
        return;
      }
    }

    this.lastPlace = Date.now();

    Network.socket
      .emitWithAck("place", {
        x,
        y,
        color: this.Pallete.getSelectedColor()!.id,
      })
      .then((ack) => {
        if (ack.success) {
          this.handlePixel(ack.data);
        } else {
          // TODO: handle undo pixel
          alert("error: " + ack.error);
        }
      });
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