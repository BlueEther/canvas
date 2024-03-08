import { type ClientConfig } from "./net";

export const CanvasLib = new (class {
  /**
   * Get pixel cooldown
   *
   * @param pixelNumber What pixel is this
   * @param config
   * @returns Seconds to take to give the pixel
   */
  getPixelCooldown(pixelNumber: number, config: ClientConfig) {
    return pixelNumber * config.canvas.pixel.cooldown;
    // const factorial = (n: number) => (n == 0 ? 1 : n * factorial(n - 1));

    // return (
    //   config.canvas.pixel.cooldown *
    //   config.canvas.pixel.multiplier *
    //   (2 + pixelNumber + factorial(pixelNumber))
    // );
  }
})();
