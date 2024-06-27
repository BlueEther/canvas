import Canvas from "../lib/Canvas";
import { getLogger } from "../lib/Logger";

const Logger = getLogger("JOB_WORKER");

/**
 * Job scheduler
 *
 * This should run in a different process
 */
export class Jobs {
  constructor() {
    Logger.info("Starting job worker...");

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
