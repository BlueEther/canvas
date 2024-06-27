import { useEffect, useRef } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { KeybindManager } from "../../lib/keybinds";
import { getRenderer } from "../../lib/utils";

export const BlankOverlay = () => {
  const { blankOverlay, setBlankOverlay } = useAppContext();
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
    if (!canvasRef.current) {
      return;
    }

    let timeout = setTimeout(() => {
      if (!canvasRef.current) return;

      getRenderer().useCanvas(canvasRef.current, "blank");
    }, 1000);

    return () => {
      clearTimeout(timeout);
      getRenderer().removeCanvas("blank");
    };
  }, [canvasRef.current]);

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
