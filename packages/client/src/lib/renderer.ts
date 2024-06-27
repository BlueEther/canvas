import { toast } from "react-toastify";
import RenderWorker from "../worker/render.worker?worker";
import {
  CanvasPixel,
  CanvasRenderer,
  CanvasRole,
  RendererEvents,
} from "./canvasRenderer";
import { ExtractMethods } from "./utils";
import EventEmitter from "eventemitter3";

const hasWorkerSupport =
  typeof Worker !== "undefined" && !localStorage.getItem("no_workers");

export abstract class Renderer
  extends EventEmitter<RendererEvents>
  implements ICanvasRenderer
{
  hasWorker: boolean;

  constructor(hasWorker: boolean) {
    super();
    this.hasWorker = hasWorker;
  }

  /**
   * Get the renderer that is available to the client
   * @returns
   */
  static create(): Renderer {
    if (hasWorkerSupport) {
      return new WorkerRenderer();
    } else {
      return new LocalRenderer();
    }
  }

  abstract usePixels(pixels: CanvasPixel[], replace?: boolean): void;
  abstract usePixel(pixel: CanvasPixel): void;
  abstract draw(): void;
  abstract setSize(width: number, height: number): void;
  abstract useCanvas(canvas: HTMLCanvasElement, role: CanvasRole): void;
  abstract removeCanvas(role: CanvasRole): void;
  abstract startRender(): void;
  abstract stopRender(): void;
}

type ICanvasRenderer = Omit<
  ExtractMethods<CanvasRenderer>,
  "useCanvas" | keyof ExtractMethods<EventEmitter>
> & {
  useCanvas: (canvas: HTMLCanvasElement, role: CanvasRole) => void;
};

class WorkerRenderer extends Renderer implements ICanvasRenderer {
  private worker: Worker;

  constructor() {
    super(true);
    this.worker = new RenderWorker();
    this.worker.addEventListener("message", (req) => {
      if (req.data.type === "ready") {
        this.emit("ready");
      }
    });
  }

  destroy(): void {
    console.warn("[WorkerRender#destroy] Destroying worker");
    this.worker.terminate();
  }

  useCanvas(canvas: HTMLCanvasElement, role: CanvasRole): void {
    const offscreen = canvas.transferControlToOffscreen();
    this.worker.postMessage({ type: "canvas", role, canvas: offscreen }, [
      offscreen,
    ]);
  }

  removeCanvas(role: CanvasRole): void {
    this.worker.postMessage({ type: "remove-canvas", role });
  }

  usePixels(pixels: CanvasPixel[], replace: boolean): void {
    this.worker.postMessage({
      type: "pixels",
      replace,
      pixels: pixels
        .map((pixel) => pixel.x + "," + pixel.y + "," + pixel.hex)
        .join(";"),
    });
  }

  usePixel({ x, y, hex }: CanvasPixel): void {
    this.worker.postMessage({
      type: "pixel",
      pixel: x + "," + y + "," + (hex || "null"),
    });
  }

  startDrawLoop(): void {
    throw new Error("Method not implemented.");
  }

  startRender(): void {
    this.worker.postMessage({ type: "startRender" });
  }

  stopRender(): void {
    this.worker.postMessage({ type: "stopRender" });
  }

  draw(): void {
    this.worker.postMessage({ type: "draw" });
  }

  setSize(width: number, height: number): void {
    this.worker.postMessage({ type: "size", width, height });
  }
}

class LocalRenderer extends Renderer implements ICanvasRenderer {
  reference: CanvasRenderer;

  constructor() {
    super(false);

    toast.error(
      "Your browser doesn't support WebWorkers, this will cause performance issues"
    );

    this.reference = new CanvasRenderer();
    this.reference.on("ready", () => this.emit("ready"));
  }

  useCanvas(canvas: HTMLCanvasElement, role: CanvasRole): void {
    this.reference.useCanvas(canvas, role);
  }
  removeCanvas(role: CanvasRole) {
    this.reference.removeCanvas(role);
  }
  usePixels(pixels: CanvasPixel[], replace: boolean): void {
    this.reference.usePixels(pixels, replace);
  }
  usePixel(pixel: CanvasPixel): void {
    this.reference.usePixel(pixel);
  }
  startRender(): void {
    this.reference.startRender();
  }
  stopRender(): void {
    this.reference.stopRender();
  }
  draw(): void {
    this.reference.draw();
  }
  setSize(width: number, height: number): void {
    this.reference.setSize(width, height);
  }
}
