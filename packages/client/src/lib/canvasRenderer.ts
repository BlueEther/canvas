import EventEmitter from "eventemitter3";

type RCanvas = HTMLCanvasElement | OffscreenCanvas;
type RContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
export type CanvasPixel = {
  x: number;
  y: number;
  hex: string;
};

const bezier = (n: number) => n * n * (3 - 2 * n);

const isWorker = () => {
  return (
    // @ts-ignore
    typeof WorkerGlobalScope !== "undefined" &&
    // @ts-ignore
    self instanceof WorkerGlobalScope
  );
};

export interface RendererEvents {
  ready: () => void;
}

export type CanvasRole = "main" | "blank";

/**
 * Generic renderer
 *
 * Can be instansiated inside worker or on the main thread
 */
export class CanvasRenderer extends EventEmitter<RendererEvents> {
  private canvas: RCanvas = undefined as any;
  private ctx: RContext = undefined as any;
  private dimentions = {
    width: 0,
    height: 0,
  };

  private blank?: RCanvas;
  private blank_ctx?: RContext;

  private pixels: CanvasPixel[] = [];
  private allPixels: CanvasPixel[] = [];
  private isWorker = isWorker();

  private _stopRender = false;

  constructor() {
    super();
    console.log("[CanvasRenderer] Initialized", { isWorker: this.isWorker });
  }

  useCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, role: CanvasRole) {
    console.log("[CanvasRenderer] Received canvas reference for " + role);

    let ctx = canvas.getContext("2d")! as any;
    if (!ctx) {
      throw new Error("Unable to get canvas context for " + role);
    }

    canvas.width = this.dimentions.width;
    canvas.height = this.dimentions.height;

    switch (role) {
      case "main":
        this.canvas = canvas;
        this.ctx = ctx;
        break;
      case "blank":
        this.blank = canvas;
        this.blank_ctx = ctx;
        break;
    }
  }

  removeCanvas(role: CanvasRole) {
    switch (role) {
      case "main":
        throw new Error("Cannot remove main canvas");
      case "blank":
        this.blank = undefined;
        this.blank_ctx = undefined;
        break;
    }
  }

  usePixels(pixels: CanvasPixel[], replace = false) {
    if (replace) {
      this.pixels = pixels;
      this.allPixels = pixels;
    } else {
      for (const pixel of pixels) {
        this.usePixel(pixel);
      }
    }
  }

  usePixel(pixel: CanvasPixel) {
    {
      let existing = this.pixels.find(
        (p) => p.x === pixel.x && p.y === pixel.y
      );
      if (existing) {
        this.pixels.splice(this.pixels.indexOf(existing), 1);
      }
    }

    {
      let existing = this.allPixels.find(
        (p) => p.x === pixel.x && p.y === pixel.y
      );
      if (existing) {
        this.allPixels.splice(this.allPixels.indexOf(existing), 1);
      }
    }

    this.pixels.push(pixel);
    this.allPixels.push(pixel);
  }

  startRender() {
    console.log("[CanvasRenderer] Started rendering loop");
    this._stopRender = false;
    this.tryDrawFull();
    this.tryDrawBlank();
    this.renderLoop();
  }

  stopRender() {
    console.log("[CanvasRenderer] Stopped rendering loop");
    // used when not in worker
    // kills the requestAnimationFrame loop
    this._stopRender = true;
  }

  private tryDrawFull() {
    if (this._stopRender) return;

    if (this.ctx) {
      this.drawFull();
    } else {
      requestAnimationFrame(() => this.tryDrawFull());
    }
  }

  private tryDrawBlank() {
    if (this._stopRender) return;

    if (this.blank_ctx) {
      this.drawBlank();

      setTimeout(() => requestAnimationFrame(() => this.tryDrawBlank()), 1000);
    } else {
      requestAnimationFrame(() => this.tryDrawBlank());
    }
  }

  private renderLoop() {
    if (this._stopRender) return;

    if (this.ctx) {
      this.draw();
    } else {
      console.warn("[CanvasRenderer#renderLoop] has no canvas context");
    }

    requestAnimationFrame(() => this.renderLoop());
  }

  private drawTimes: number[] = [];

  /**
   * Draw canvas
   *
   * This should be done using differences
   */
  draw() {
    const start = performance.now();

    const pixels = [...this.pixels];
    this.pixels = [];

    if (pixels.length) {
      console.log("[CanvasRenderer#draw] drawing " + pixels.length + " pixels");
    }

    for (const pixel of pixels) {
      this.ctx.fillStyle = pixel.hex === "null" ? "#fff" : "#" + pixel.hex;
      this.ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }

    const diff = performance.now() - start;
    this.drawTimes = this.drawTimes.slice(0, 300);
    const drawavg =
      this.drawTimes.length > 0
        ? this.drawTimes.reduce((a, b) => a + b) / this.drawTimes.length
        : 0;
    if (diff > 0) this.drawTimes.push(diff);

    if (diff > drawavg) {
      console.warn(
        `canvas#draw took ${diff} ms (> avg: ${drawavg} ; ${this.drawTimes.length} samples)`
      );
    }
  }

  /**
   * fully draw canvas
   */
  private drawFull() {
    // --- main canvas ---

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.globalAlpha = 1;

    // clear canvas
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const pixel of this.allPixels) {
      this.ctx.fillStyle = pixel.hex === "null" ? "#fff" : "#" + pixel.hex;
      this.ctx.fillRect(pixel.x, pixel.y, 1, 1);
    }
  }

  private drawBlank() {
    if (this.blank && this.blank_ctx) {
      // --- blank canvas ---

      let canvas = this.blank;
      let ctx = this.blank_ctx;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const pixel of this.allPixels) {
        if (pixel.hex !== "null") continue;

        ctx.fillStyle = "rgba(0,140,0,0.5)";
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
      }
    }
  }

  setSize(width: number, height: number) {
    console.log("[CanvasRenderer] Received size set", { width, height });

    this.dimentions = { width, height };

    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (this.blank) {
      this.blank.width = width;
      this.blank.height = height;
    }

    this.tryDrawFull();
    this.emit("ready");
  }
}
