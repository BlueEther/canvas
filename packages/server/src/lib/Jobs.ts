import Canvas from "./Canvas";
import { Logger } from "./Logger";

export class Jobs {
  constructor() {
    // every 5 minutes
    setInterval(this.generateHeatmap, 1000 * 60 * 5);

    this.generateHeatmap();
  }

  async generateHeatmap() {
    Logger.info("Generating heatmap...");
    const now = Date.now();

    await Canvas.generateHeatmap();

    Logger.info(
      "Generated heatmap in " +
        ((Date.now() - now) / 1000).toFixed(1) +
        " seconds"
    );
  }
}
