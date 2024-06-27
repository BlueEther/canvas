/**
 * Worker to handle canvas draws to free the main thread
 */

import { CanvasPixel, CanvasRenderer, CanvasRole } from "../lib/canvasRenderer";

console.log("[Render Worker] Initialize");

const renderer = new CanvasRenderer();

renderer.on("ready", () => {
  postMessage({ type: "ready" });
});

addEventListener("message", (req) => {
  switch (req.data.type) {
    case "canvas": {
      const canvas: OffscreenCanvas = req.data.canvas;
      const role: CanvasRole = req.data.role;
      renderer.useCanvas(canvas, role);
      renderer.renderLoop();
      break;
    }
    case "remove-canvas": {
      const role: CanvasRole = req.data.role;
      renderer.removeCanvas(role);
      break;
    }
    case "size": {
      const width: number = req.data.width;
      const height: number = req.data.height;
      renderer.setSize(width, height);
      break;
    }
    case "pixels": {
      const pixelsIn: string = req.data.pixels;
      const replace: boolean = req.data.replace;
      const pixels = deserializePixels(pixelsIn);
      renderer.usePixels(pixels, replace);
      break;
    }
    case "pixel": {
      const pixel = deserializePixel(req.data.pixel);
      renderer.usePixel(pixel);
      break;
    }
    case "startRender": {
      renderer.startRender();
      break;
    }
    case "stopRender": {
      renderer.stopRender();
      break;
    }
    default:
      console.warn(
        "[Render Worker] Received unknown message type",
        req.data.type
      );
  }
});

const deserializePixel = (str: string): CanvasPixel => {
  let [x, y, hex] = str.split(",");
  return {
    x: parseInt(x),
    y: parseInt(y),
    hex,
  };
};

const deserializePixels = (str: string): CanvasPixel[] => {
  let pixels: CanvasPixel[] = [];

  const pixelsIn = str.split(";");
  for (const pixel of pixelsIn) {
    pixels.push(deserializePixel(pixel));
  }

  return pixels;
};
