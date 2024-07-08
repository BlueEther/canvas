import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Canvas } from "../lib/canvas";
import { useAppContext } from "../contexts/AppContext";
import { PanZoomWrapper } from "@sc07-canvas/lib/src/renderer";
import { RendererContext } from "@sc07-canvas/lib/src/renderer/RendererContext";
import { ViewportMoveEvent } from "@sc07-canvas/lib/src/renderer/PanZoom";
import throttle from "lodash.throttle";
import { IPosition } from "@sc07-canvas/lib/src/net";
import { Template } from "./Templating/Template";
import { Template as TemplateCl } from "../lib/template";
import { IRouterData, Router } from "../lib/router";
import { KeybindManager } from "../lib/keybinds";
import { BlankOverlay } from "./Overlay/BlankOverlay";
import { HeatmapOverlay } from "./Overlay/HeatmapOverlay";
import { useTemplateContext } from "../contexts/TemplateContext";

export const CanvasWrapper = () => {
  const { config } = useAppContext();
  // to prevent safari from blurring things, use the zoom css property

  return (
    <main>
      <PanZoomWrapper>
        <BlankOverlay />
        <HeatmapOverlay />
        {config && <Template />}
        <CanvasInner />
        <Cursor />
      </PanZoomWrapper>
    </main>
  );
};

const Cursor = () => {
  const { cursor } = useAppContext();
  const [color, setColor] = useState<string>();

  useEffect(() => {
    if (typeof cursor.color === "number") {
      const color = Canvas.instance?.Pallete.getColor(cursor.color);
      setColor(color?.hex);
    } else {
      setColor(undefined);
    }
  }, [setColor, cursor.color]);

  if (!color) return <></>;

  return (
    <div
      className="noselect"
      style={{
        position: "absolute",
        top: cursor.y,
        left: cursor.x,
        backgroundColor: "#" + color,
        width: "1px",
        height: "1px",
        opacity: 0.5,
      }}
    ></div>
  );
};

const CanvasInner = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>();
  const canvas = useRef<Canvas>();
  const { config, setCanvasPosition, setCursor, setPixelWhois } =
    useAppContext();
  const {
    x: templateX,
    y: templateY,
    enable: templateEnable,
  } = useTemplateContext();
  const PanZoom = useContext(RendererContext);

  /**
   * Is the canvas coordinate within the bounds of the canvas?
   */
  const isCoordInCanvas = useCallback(
    (x: number, y: number): boolean => {
      if (!canvas.current) {
        console.warn(
          "[CanvasWrapper#isCoordInCanvas] canvas instance does not exist"
        );
        return false;
      }

      if (x < 0 || y < 0) return false; // not positive, impossible to be on canvas

      // canvas size can dynamically change, so we need to check the current config
      // we're depending on canvas.instance's config so we don't have to use a react dependency
      if (canvas.current.hasConfig()) {
        const {
          canvas: {
            size: [width, height],
          },
        } = canvas.current.getConfig();

        if (x >= width || y >= height) return false; // out of bounds
      } else {
        // although this should never happen, log it
        console.warn(
          "[CanvasWrapper#isCoordInCanvas] canvas config is not available yet"
        );
      }

      return true;
    },
    [canvas.current]
  );

  const handlePixelWhois = useCallback(
    ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      if (!canvas.current) {
        console.warn(
          "[CanvasWrapper#handlePixelWhois] canvas instance does not exist"
        );
        return;
      }

      const [x, y] = canvas.current.screenToPos(clientX, clientY);
      if (!isCoordInCanvas(x, y)) return; // out of bounds

      // .......
      // .......
      // .......
      // ...x...
      // .......
      // .......
      // .......
      const surrounding = canvas.current.getSurroundingPixels(x, y, 3);

      setPixelWhois({ x, y, surrounding });
    },
    [canvas.current]
  );

  const getTemplatePixel = useCallback(
    (x: number, y: number) => {
      if (!templateEnable) return;
      if (x < templateX || y < templateY) return;

      x -= templateX;
      y -= templateY;

      return TemplateCl.instance.getPixel(x, y);
    },
    [templateX, templateY]
  );

  const handlePickPixel = useCallback(
    ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      if (!canvas.current) {
        console.warn(
          "[CanvasWrapper#handlePickPixel] canvas instance does not exist"
        );
        return;
      }

      const [x, y] = canvas.current.screenToPos(clientX, clientY);
      if (!isCoordInCanvas(x, y)) return; // out of bounds

      let pixelColor = -1;

      const templatePixel = getTemplatePixel(x, y);
      if (templatePixel) {
        pixelColor =
          canvas.current.Pallete.getColorFromHex(templatePixel.slice(1))?.id ||
          -1;
      }

      if (pixelColor === -1) {
        pixelColor = canvas.current.getPixel(x, y)?.color || -1;
      }

      if (pixelColor === -1) {
        return;
      }

      // no need to use canvas#setCursor as Palette.tsx already does that
      setCursor((v) => ({
        ...v,
        color: pixelColor,
      }));
    },
    [canvas.current]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    canvas.current = new Canvas(canvasRef.current!, PanZoom);
    canvas.current.on("canvasReady", () => {
      console.log("[CanvasWrapper] received canvasReady");

      // refresh because canvas might've resized
      const initialRouter = Router.get();
      handleNavigate(initialRouter);
    });

    KeybindManager.on("PIXEL_WHOIS", handlePixelWhois);
    KeybindManager.on("PICK_COLOR", handlePickPixel);

    return () => {
      KeybindManager.off("PIXEL_WHOIS", handlePixelWhois);
      KeybindManager.off("PICK_COLOR", handlePickPixel);
      canvas.current!.destroy();
    };
  }, [PanZoom]);

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
        setCursor((v) => ({
          ...v,
          x: undefined,
          y: undefined,
        }));
      } else {
        // fixes not passing the current value
        setCursor((v) => ({
          ...v,
          x: pos.x,
          y: pos.y,
        }));
      }
    }, 1);

    canvas.current.on("cursorPos", handleCursorPos);

    return () => {
      canvas.current!.off("cursorPos", handleCursorPos);
    };
  }, [config, setCursor]);

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
  }, [PanZoom, setCanvasPosition]);

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
