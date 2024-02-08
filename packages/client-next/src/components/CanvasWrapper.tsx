import React, { createRef, useEffect } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from "react-zoom-pan-pinch";
import { Canvas } from "../lib/canvas";
import { useAppContext } from "../contexts/AppContext";
import throttle from "lodash.throttle";

export const CanvasWrapper = () => {
  // to prevent safari from blurring things, use the zoom css property
  return (
    <main>
      <TransformWrapper
        centerOnInit
        limitToBounds={false}
        centerZoomedOut={false}
        minScale={0.5}
        maxScale={50}
        wheel={{
          step: 0.05,
          smoothStep: 0.05,
        }}
        initialScale={5}
        panning={{
          velocityDisabled: true,
        }}
        doubleClick={{
          disabled: true,
        }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <CanvasInner />
        </TransformComponent>
      </TransformWrapper>
    </main>
  );
};

const CanvasInner = () => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const { config } = useAppContext();
  const { centerView } = useControls();

  useTransformEffect(
    throttle(({ state, instance }) => {
      const params = new URLSearchParams();
      params.set("x", state.positionX + "");
      params.set("y", state.positionY + "");
      params.set("zoom", state.scale + "");
      window.location.hash = params.toString();
    }, 1000)
  );

  useEffect(() => {
    if (!config.canvas || !canvasRef.current) return;
    const canvas = canvasRef.current!;
    const canvasInstance = new Canvas(config, canvas);
    centerView();

    return () => {
      canvasInstance.destroy();
    };
  }, [canvasRef, centerView, config]);

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
