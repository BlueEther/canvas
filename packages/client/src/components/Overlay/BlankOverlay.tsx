import { useEffect, useRef } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { Canvas } from "../../lib/canvas";
import { KeybindManager } from "../../lib/keybinds";

export const BlankOverlay = () => {
  const { config, blankOverlay, setBlankOverlay } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleKeybind = () => {
      setBlankOverlay((v) => ({ ...v, enabled: !v.enabled }));
    };

    KeybindManager.on("TOGGLE_BLANK", handleKeybind);

    return () => {
      KeybindManager.off("TOGGLE_BLANK", handleKeybind);
    };
  }, [setBlankOverlay]);

  useEffect(() => {
    if (!config) {
      console.warn("[BlankOverlay] config is not defined");
      return;
    }
    if (!canvasRef.current) {
      console.warn("[BlankOverlay] canvasRef is not defined");
      return;
    }

    const [width, height] = config.canvas.size;

    canvasRef.current.width = width;
    canvasRef.current.height = height;
  }, [config]);

  useEffect(() => {
    if (!canvasRef.current) {
      console.warn("[BlankOverlay] canvasRef is not defined");
      return;
    }

    const updateVirginmap = () => {
      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) {
        console.warn("[BlankOverlay] canvas context cannot be aquired");
        return;
      }

      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

      const pixels = Canvas.instance!.getAllPixels();
      for (const pixel of pixels) {
        if (pixel.color !== -1) continue;

        ctx.fillStyle = "rgba(0,140,0,0.5)";
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
      }
    };

    var updateInterval = setInterval(updateVirginmap, 1000);

    return () => {
      clearInterval(updateInterval);
    };
  }, [canvasRef]);

  return (
    <canvas
      id="blank-overlay"
      className="board-overlay no-interact pixelate"
      ref={(r) => (canvasRef.current = r)}
      width="1000"
      height="1000"
      style={{
        display: blankOverlay.enabled ? "block" : "none",
        opacity: blankOverlay.opacity.toFixed(1),
      }}
    />
  );
};
