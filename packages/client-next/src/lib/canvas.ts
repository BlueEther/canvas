import EventEmitter from "eventemitter3";
import { ClientConfig, IPalleteContext, Pixel } from "../types";
import Network from "./network";

export class Canvas extends EventEmitter {
  static instance: Canvas | undefined;

  private _destroy = false;
  private config: ClientConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private cursor = { x: -1, y: -1 };
  private pixels: {
    [x_y: string]: { color: number; type: "full" | "pending" };
  } = {};
  private lastPlace: number | undefined;

  constructor(config: ClientConfig, canvas: HTMLCanvasElement) {
    super();
    Canvas.instance = this;

    this.config = config;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    canvas.width = config.canvas.size[0];
    canvas.height = config.canvas.size[1];

    canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    canvas.addEventListener("mouseup", this.handleMouseClick.bind(this));
    canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));

    this.on("pallete", this.updatePallete.bind(this));

    // Network.on("canvas", this.handleBatch.bind(this));
    Network.waitFor("canvas").then(([pixels]) => this.handleBatch(pixels));

    this.draw();
  }

  destroy() {
    this._destroy = true;

    this.canvas.removeEventListener(
      "mousemove",
      this.handleMouseMove.bind(this)
    );
    this.canvas.removeEventListener(
      "mouseup",
      this.handleMouseClick.bind(this)
    );
    this.canvas.removeEventListener(
      "mousedown",
      this.handleMouseDown.bind(this)
    );

    Network.off("canvas", this.handleBatch.bind(this));
  }

  private downTime: number | undefined;
  private dragOrigin: { x: number; y: number } = { x: 0, y: 0 };

  handleMouseClick(e: MouseEvent) {
    const downDelta = Date.now() - this.downTime!;
    const delta = [
      Math.abs(this.dragOrigin.x - e.clientX),
      Math.abs(this.dragOrigin.y - e.clientY),
    ];
    if (downDelta < 500) {
      // mouse was down for less than 500ms

      if (delta[0] < 5 && delta[1] < 5) {
        const [x, y] = this.screenToPos(e.clientX, e.clientY);
        this.place(x, y);
      }
    }
  }

  handleMouseDown(e: MouseEvent) {
    this.downTime = Date.now();
    this.dragOrigin = { x: e.pageX, y: e.pageY };
  }

  handleMouseMove(e: MouseEvent) {
    const canvasRect = this.canvas.getBoundingClientRect();
    if (
      canvasRect.left <= e.pageX &&
      canvasRect.right >= e.pageX &&
      canvasRect.top <= e.pageY &&
      canvasRect.bottom >= e.pageY
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
      const x = index / this.config.canvas.size[0];
      const y = index % this.config.canvas.size[0];
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

  screenToPos(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = [
      this.canvas.width / rect.width,
      this.canvas.height / rect.height,
    ];
    return [x - rect.left, y - rect.top]
      .map((v, i) => v * scale[i])
      .map((v) => v >> 0);
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
