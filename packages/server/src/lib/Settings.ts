import Canvas from "./Canvas";
import { getLogger } from "./Logger";
import { prisma } from "./prisma";

const Logger = getLogger("SETTINGS");

export const loadSettings = async (frozen = false) => {
  Logger.info("Loading settings...");

  const sideEffects: Promise<unknown>[] = [];

  // canvas size
  const canvasSize = await prisma.setting.findFirst({
    where: { key: "canvas.size" },
  });
  if (canvasSize) {
    const data = JSON.parse(canvasSize.value);
    Logger.info("Canvas size loaded as " + JSON.stringify(data));

    sideEffects.push(
      Canvas.setSize(data.width, data.height, frozen).then(() => {
        Logger.info("Canvas size successfully updated");
      })
    );
  } else {
    Logger.warn("Setting canvas.size is not set, did you run init_settings?");
  }

  // canvas frozen
  const canvasFrozen = await prisma.setting.findFirst({
    where: { key: "canvas.frozen" },
  });
  if (canvasFrozen) {
    const data = JSON.parse(canvasFrozen.value);
    Logger.info(`Canvas frozen loaded as ${data}`);

    Canvas.setFrozen(data);
  }

  Logger.info(
    "Settings loaded into memory, waiting for side effects to finish..."
  );

  await Promise.allSettled(sideEffects);
};
