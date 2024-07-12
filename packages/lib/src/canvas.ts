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
    // return pixelNumber * config.canvas.pixel.cooldown;
    // const factorial = (n: number): number => (n == 0 ? 1 : n * factorial(n - 1));

    // return (
    //   config.canvas.pixel.cooldown *
    //   config.canvas.pixel.multiplier *
    //   (2 + pixelNumber + factorial(pixelNumber))
    // );

    // oh god last minute change to match activity cooldown
    // 100 = user count
    return (2.5 * Math.sqrt(100 + 11.96) + 6.5) * 1 * pixelNumber;
  }
})();
