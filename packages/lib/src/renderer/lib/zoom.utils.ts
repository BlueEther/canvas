import { PanZoom } from "../PanZoom";

export function handleCalculateZoomPositions(
  contextInstance: PanZoom,
  mouseX: number,
  mouseY: number,
  newScale: number
): { x: number; y: number } {
  const { scale, x, y } = contextInstance.transform;

  const scaleDifference = newScale - scale;

  if (typeof mouseX !== "number" || typeof mouseY !== "number") {
    console.error("Mouse X and Y position were not provided!");
    return { x, y };
  }

  const calculatedPositionX = x - mouseX * scaleDifference;
  const calculatedPositionY = y - mouseY * scaleDifference;
  contextInstance.debug(calculatedPositionX, calculatedPositionY, "zoom");

  // do not limit to bounds when there is padding animation,
  // it causes animation strange behaviour

  // const newPositions = getMouseBoundedPosition(
  //   calculatedPositionX,
  //   calculatedPositionY,
  //   bounds,
  //   limitToBounds,
  //   0,
  //   0,
  //   null,
  // );

  return {
    x: calculatedPositionX,
    y: calculatedPositionY,
  };
}

export function checkZoomBounds(
  zoom: number,
  minScale: number,
  maxScale: number
): number {
  if (!Number.isNaN(maxScale) && zoom >= maxScale) return maxScale;
  if (!Number.isNaN(minScale) && zoom <= minScale) return minScale;
  return zoom;
}
