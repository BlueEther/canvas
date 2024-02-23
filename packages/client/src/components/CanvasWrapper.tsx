import { createRef, useContext, useEffect } from "react";
import { Canvas } from "../lib/canvas";
import { useAppContext } from "../contexts/AppContext";
import { PanZoomWrapper } from "@sc07-canvas/lib/src/renderer";
import { RendererContext } from "@sc07-canvas/lib/src/renderer/RendererContext";
import { ViewportMoveEvent } from "@sc07-canvas/lib/src/renderer/PanZoom";
import throttle from "lodash.throttle";
import { ICanvasPosition, IPosition } from "../types";
import { Routes } from "../lib/routes";

export const CanvasWrapper = () => {
  // to prevent safari from blurring things, use the zoom css property
  return (
    <main>
      <PanZoomWrapper>
        <CanvasInner />
      </PanZoomWrapper>
    </main>
  );
};

const parseHashParams = (canvas: Canvas) => {
  // maybe move this to a utility inside routes.ts

  let { hash } = new URL(window.location.href);
  if (hash.indexOf("#") === 0) {
    hash = hash.slice(1);
  }
  let params = new URLSearchParams(hash);

  let position: {
    x?: number;
    y?: number;
    zoom?: number;
  } = {};

  if (params.has("x") && !isNaN(parseInt(params.get("x")!)))
    position.x = parseInt(params.get("x")!);
  if (params.has("y") && !isNaN(parseInt(params.get("y")!)))
    position.y = parseInt(params.get("y")!);
  if (params.has("zoom") && !isNaN(parseInt(params.get("zoom")!)))
    position.zoom = parseInt(params.get("zoom")!);

  if (
    typeof position.x === "number" &&
    typeof position.y === "number" &&
    typeof position.zoom === "number"
  ) {
    const { transformX, transformY } = canvas.canvasToPanZoomTransform(
      position.x,
      position.y
    );

    return {
      x: transformX,
      y: transformY,
      zoom: position.zoom,
    };
  }
};

const CanvasInner = () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const { config, setCanvasPosition, setCursorPosition } = useAppContext();
  const PanZoom = useContext(RendererContext);

  useEffect(() => {
    if (!config.canvas || !canvasRef.current) return;
    const canvas = canvasRef.current!;
    const canvasInstance = new Canvas(config, canvas, PanZoom);

    {
      // TODO: handle hash changes and move viewport
      // NOTE: this will need to be cancelled if handleViewportMove was executed recently

      const position = parseHashParams(canvasInstance);
      if (position) {
        PanZoom.setPosition(position, { suppressEmit: true });
      }
    }

    const handleViewportMove = throttle((state: ViewportMoveEvent) => {
      const pos = canvasInstance.panZoomTransformToCanvas();

      const canvasPosition: ICanvasPosition = {
        x: pos.canvasX,
        y: pos.canvasY,
        zoom: state.scale >> 0,
      };

      setCanvasPosition(canvasPosition);

      window.location.replace(Routes.canvas(canvasPosition));
    }, 1000);

    const handleCursorPos = throttle((pos: IPosition) => {
      if (
        pos.x < 0 ||
        pos.y < 0 ||
        pos.x > config.canvas.size[0] ||
        pos.y > config.canvas.size[1]
      ) {
        setCursorPosition();
      } else {
        // fixes not passing the current value
        setCursorPosition({ ...pos });
      }
    }, 1);

    PanZoom.addListener("viewportMove", handleViewportMove);
    canvasInstance.on("cursorPos", handleCursorPos);

    return () => {
      canvasInstance.destroy();
      PanZoom.removeListener("viewportMove", handleViewportMove);
      canvasInstance.off("cursorPos", handleCursorPos);
    };

    // do not include canvasRef, it causes infinite re-renders
  }, [PanZoom, config, setCanvasPosition, setCursorPosition]);

  return (
    <canvas
      id="board"
      width="1000"
      height="1000"
      className="pixelate"
      ref={canvasRef}
    ></canvas>
  );
};
