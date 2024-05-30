import Canvas from "./Canvas";
import { Logger } from "./Logger";
import { prisma } from "./prisma";

export const loadSettings = async () => {
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
      Canvas.setSize(data.width, data.height).then(() => {
        Logger.info("Canvas size successfully updated");
      })
    );
  } else {
    Logger.warn("Setting canvas.size is not set, did you run init_settings?");
  }

  Logger.info(
    "Settings loaded into memory, waiting for side effects to finish..."
  );

  await Promise.allSettled(sideEffects);
};
