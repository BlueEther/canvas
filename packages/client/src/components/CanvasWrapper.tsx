import { useCallback, useContext, useEffect, useRef } from "react";
import { Canvas } from "../lib/canvas";
import { useAppContext } from "../contexts/AppContext";
import { PanZoomWrapper } from "@sc07-canvas/lib/src/renderer";
import { RendererContext } from "@sc07-canvas/lib/src/renderer/RendererContext";
import { ViewportMoveEvent } from "@sc07-canvas/lib/src/renderer/PanZoom";
import throttle from "lodash.throttle";
import { IPosition } from "@sc07-canvas/lib/src/net";
import { Template } from "./Template";
import { IRouterData, Router } from "../lib/router";
import { KeybindManager } from "../lib/keybinds";
import { VirginOverlay } from "./Overlay/VirginOverlay";
import { HeatmapOverlay } from "./Overlay/HeatmapOverlay";

export const CanvasWrapper = () => {
  const { config } = useAppContext();
  // to prevent safari from blurring things, use the zoom css property

  return (
    <main>
      <PanZoomWrapper>
        <VirginOverlay />
        <HeatmapOverlay />
        {config && <Template />}
        <CanvasInner />
      </PanZoomWrapper>
    </main>
  );
};

const CanvasInner = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>();
  const canvas = useRef<Canvas>();
  const { config, setCanvasPosition, setCursorPosition, setPixelWhois } =
    useAppContext();
  const PanZoom = useContext(RendererContext);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvas.current = new Canvas(canvasRef.current!, PanZoom);

    const handlePixelWhois = ({
      clientX,
      clientY,
    }: {
      clientX: number;
      clientY: number;
    }) => {
      if (!canvas.current) {
        console.warn(
          "[CanvasWrapper#handlePixelWhois] canvas instance does not exist"
        );
        return;
      }

      const [x, y] = canvas.current.screenToPos(clientX, clientY);
      if (x < 0 || y < 0) return; // discard if out of bounds

      // canvas size can dynamically change, so we need to check the current config
      // we're depending on canvas.instance's config so we don't have to use a react dependency
      if (canvas.current.hasConfig()) {
        const {
          canvas: {
            size: [width, height],
          },
        } = canvas.current.getConfig();

        if (x >= width || y >= height) return; // out of bounds
      } else {
        // although this should never happen, log it
        console.warn(
          "[CanvasWrapper#handlePixelWhois] canvas config is not available yet"
        );
      }

      // .......
      // .......
      // .......
      // ...x...
      // .......
      // .......
      // .......
      const surrounding = canvas.current.getSurroundingPixels(x, y, 3);

      setPixelWhois({ x, y, surrounding });
    };

    KeybindManager.on("PIXEL_WHOIS", handlePixelWhois);

    return () => {
      KeybindManager.off("PIXEL_WHOIS", handlePixelWhois);
      canvas.current!.destroy();
    };
  }, [PanZoom, setCursorPosition]);

  useEffect(() => {
    Router.PanZoom = PanZoom;
  }, [PanZoom]);

  useEffect(() => {
    if (!canvas.current) {
      console.warn("canvas isntance doesn't exist");
      return;
    }

    const handleCursorPos = throttle((pos: IPosition) => {
      if (!canvas.current?.hasConfig() || !config) {
        console.warn("handleCursorPos has no config");
        return;
      }

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

    canvas.current.on("cursorPos", handleCursorPos);

    return () => {
      canvas.current!.off("cursorPos", handleCursorPos);
    };
  }, [config, setCursorPosition]);

  useEffect(() => {
    if (!canvas.current) {
      console.warn("canvasinner config received but no canvas instance");
      return;
    }
    if (!config) {
      console.warn("canvasinner config received falsey");
      return;
    }

    console.log("[CanvasInner] config updated, informing canvas instance");
    canvas.current.loadConfig(config);

    // refresh because canvas might've resized
    const initialRouter = Router.get();
    console.log(
      "[CanvasWrapper] Config updated, triggering navigate",
      initialRouter
    );
    handleNavigate(initialRouter);
  }, [config]);

  const handleNavigate = useCallback(
    (data: IRouterData) => {
      if (data.canvas) {
        const position = canvas.current!.canvasToPanZoomTransform(
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
    },
    [PanZoom]
  );

  useEffect(() => {
    // if (!config?.canvas || !canvasRef.current) return;
    // const canvas = canvasRef.current!;
    // const canvasInstance = new Canvas(canvas, PanZoom);
    const initAt = Date.now();

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

      if (canvas.current) {
        const pos = canvas.current?.panZoomTransformToCanvas();
        setCanvasPosition({
          x: pos.canvasX,
          y: pos.canvasY,
          zoom: state.scale >> 0,
        });
      } else {
        console.warn(
          "[CanvasWrapper] handleViewportMove has no canvas instance"
        );
      }

      Router.queueUpdate();
    };

    PanZoom.addListener("viewportMove", handleViewportMove);
    Router.on("navigate", handleNavigate);

    return () => {
      PanZoom.removeListener("viewportMove", handleViewportMove);
      Router.off("navigate", handleNavigate);
    };
  }, [PanZoom, setCanvasPosition, setCursorPosition]);

  return (
    <canvas
      id="board"
      width="1000"
      height="1000"
      className="pixelate"
      ref={(ref) => (canvasRef.current = ref)}
    ></canvas>
  );
};
