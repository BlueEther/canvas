import { createRef, useContext, useEffect } from "react";
import { Canvas } from "../lib/canvas";
import { useAppContext } from "../contexts/AppContext";
import { PanZoomWrapper } from "@sc07-canvas/lib/src/renderer";
import { RendererContext } from "@sc07-canvas/lib/src/renderer/RendererContext";
import { ViewportMoveEvent } from "@sc07-canvas/lib/src/renderer/PanZoom";
import throttle from "lodash.throttle";
import { IPosition } from "@sc07-canvas/lib/src/net";
import { Template } from "./Template";
import { IRouterData, Router } from "../lib/router";

export const CanvasWrapper = () => {
  // to prevent safari from blurring things, use the zoom css property
  return (
    <main>
      <PanZoomWrapper>
        <Template />
        <CanvasInner />
      </PanZoomWrapper>
    </main>
  );
};

const CanvasInner = () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const { config, setCanvasPosition, setCursorPosition } = useAppContext();
  const PanZoom = useContext(RendererContext);

  useEffect(() => {
    Router.PanZoom = PanZoom;
  }, [PanZoom]);

  useEffect(() => {
    if (!config.canvas || !canvasRef.current) return;
    const canvas = canvasRef.current!;
    const canvasInstance = new Canvas(config, canvas, PanZoom);
    const initAt = Date.now();

    const handleNavigate = (data: IRouterData) => {
      if (data.canvas) {
        const position = canvasInstance.canvasToPanZoomTransform(
          data.canvas.x,
          data.canvas.y
        );

        PanZoom.setPosition(
          {
            x: position.transformX,
            y: position.transformY,
            zoom: data.canvas.zoom || 0, // TODO: fit canvas to viewport instead of defaulting
          },
          { suppressEmit: true }
        );
      }
    };

    // initial load
    const initialRouter = Router.get();
    console.log(
      "[CanvasWrapper] Initial router data, handling navigate",
      initialRouter
    );
    handleNavigate(initialRouter);

    const handleViewportMove = (state: ViewportMoveEvent) => {
      if (Date.now() - initAt < 60 * 1000) {
        console.debug(
          "[CanvasWrapper] handleViewportMove called soon after init",
          Date.now() - initAt
        );
      }

      Router.queueUpdate();
    };

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
    Router.on("navigate", handleNavigate);

    return () => {
      canvasInstance.destroy();
      PanZoom.removeListener("viewportMove", handleViewportMove);
      canvasInstance.off("cursorPos", handleCursorPos);
      Router.off("navigate", handleNavigate);
    };

    // ! do not include canvasRef, it causes infinite re-renders
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
