import { createRef, useContext, useEffect } from "react";
import { Canvas } from "../lib/canvas";
import { useAppContext } from "../contexts/AppContext";
import { PanZoomWrapper } from "@sc07-canvas/lib/src/renderer";
import { RendererContext } from "@sc07-canvas/lib/src/renderer/RendererContext";
import { ViewportMoveEvent } from "@sc07-canvas/lib/src/renderer/PanZoom";
import throttle from "lodash.throttle";
import { ICanvasPosition } from "../types";
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

const CanvasInner = () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const { config, setCanvasPosition } = useAppContext();
  const PanZoom = useContext(RendererContext);
  // const { centerView } = useControls();

  useEffect(() => {
    if (!config.canvas || !canvasRef.current) return;
    const canvas = canvasRef.current!;
    const canvasInstance = new Canvas(config, canvas, PanZoom);
    // centerView();

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

    PanZoom.addListener("viewportMove", handleViewportMove);

    return () => {
      canvasInstance.destroy();
      PanZoom.removeListener("viewportMove", handleViewportMove);
    };
  }, [PanZoom, canvasRef, config, setCanvasPosition]);

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
