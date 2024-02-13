import { PanZoom } from "../PanZoom";
import { checkZoomBounds } from "./zoom.utils";

export const getTouchDistance = (event: TouchEvent): number => {
  return Math.sqrt(
    (event.touches[0].pageX - event.touches[1].pageX) ** 2 +
      (event.touches[0].pageY - event.touches[1].pageY) ** 2
  );
};

export const roundNumber = (num: number, decimal: number) => {
  return Number(num.toFixed(decimal));
};

export const calculatePinchZoom = (
  contextInstance: PanZoom,
  currentDistance: number
): number => {
  const { touch, setup } = contextInstance;
  const { scale } = setup;
  // const { maxScale, minScale, zoomAnimation, disablePadding } = setup;
  // const { size, disabled } = zoomAnimation;

  const [minScale, maxScale] = scale;

  if (
    !touch.pinchStartScale ||
    touch.pinchStartDistance === null ||
    !currentDistance
  ) {
    throw new Error("Pinch touches distance was not provided");
  }

  if (currentDistance < 0) {
    return contextInstance.transform.scale;
  }

  const touchProportion = currentDistance / touch.pinchStartDistance;
  const scaleDifference = touchProportion * touch.pinchStartScale;

  return checkZoomBounds(roundNumber(scaleDifference, 2), minScale, maxScale);
};

export const calculateTouchMidPoint = (
  instance: PanZoom,
  event: TouchEvent,
  scale: number,
  contentComponent: HTMLElement
): { x: number; y: number } => {
  const contentRect = contentComponent.getBoundingClientRect();
  const { touches } = event;
  const firstPointX = roundNumber(touches[0].clientX - contentRect.left, 5);
  const firstPointY = roundNumber(touches[0].clientY - contentRect.top, 5);
  const secondPointX = roundNumber(touches[1].clientX - contentRect.left, 5);
  const secondPointY = roundNumber(touches[1].clientY - contentRect.top, 5);

  return {
    x: (firstPointX + secondPointX) / 2,
    y: (firstPointY + secondPointY) / 2,
  };
};
