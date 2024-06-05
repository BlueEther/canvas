import { useCallback, useEffect, useRef } from "react";
import { useAppContext } from "../../contexts/AppContext";
import { KeybindManager } from "../../lib/keybinds";
import { api } from "../../lib/utils";
import { toast } from "react-toastify";
import network from "../../lib/network";

export const HeatmapOverlay = () => {
  const { config, heatmapOverlay, setHeatmapOverlay } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleKeybind = () => {
      setHeatmapOverlay((v) => ({ ...v, enabled: !v.enabled }));
    };

    KeybindManager.on("TOGGLE_HEATMAP", handleKeybind);

    return () => {
      KeybindManager.off("TOGGLE_HEATMAP", handleKeybind);
    };
  }, [setHeatmapOverlay]);

  useEffect(() => {
    if (!config) {
      console.warn("[HeatmapOverlay] config is not defined");
      return;
    }
    if (!canvasRef.current) {
      console.warn("[HeatmapOverlay] canvasRef is not defined");
      return;
    }

    const [width, height] = config.canvas.size;

    canvasRef.current.width = width;
    canvasRef.current.height = height;
  }, [config]);

  const drawHeatmap = useCallback(
    (rawData: string) => {
      console.debug("[HeatmapOverlay] drawing heatmap");
      if (!config) {
        console.warn("[HeatmapOverlay] no config instance available");
        return;
      }

      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) {
        console.warn("[HeatmapOverlay] canvas context cannot be aquired");
        return;
      }

      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);

      if (heatmapOverlay.enabled) {
        let heatmap = rawData.split("");
        let lines: number[][] = [];

        while (heatmap.length > 0) {
          // each pixel is stored as 2 characters
          let line = heatmap.splice(0, config?.canvas.size[0] * 2).join("");
          let pixels = (line.match(/.{1,2}/g) || []).map(
            (v) => parseInt(v, 36) / 100
          );

          lines.push(pixels);
        }

        for (let y = 0; y < lines.length; y++) {
          for (let x = 0; x < lines[y].length; x++) {
            const val = lines[y][x];

            ctx.fillStyle = `rgba(255, 0, 0, ${Math.max(val, 0.1).toFixed(2)})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      } else {
        console.warn(
          "[HeatmapOverlay] drawHeatmap called with heatmap disabled"
        );
      }
    },
    [config, heatmapOverlay.enabled]
  );

  const updateHeatmap = useCallback(() => {
    setHeatmapOverlay((v) => ({ ...v, loading: true }));

    api<{ heatmap: string }, "heatmap_not_generated">("/api/heatmap")
      .then(({ status, data }) => {
        if (status === 200 && data.success) {
          drawHeatmap(data.heatmap);
        } else {
          if ("error" in data) {
            switch (data.error) {
              case "heatmap_not_generated":
                toast.info("Heatmap is not generated. Try again shortly");
                setHeatmapOverlay((v) => ({ ...v, enabled: false }));
                break;
              default:
                toast.error("Unknown error: " + data.error);
            }
          } else {
            toast.error("Failed to load heatmap: Error " + status);
          }
        }
      })
      .finally(() => {
        setHeatmapOverlay((v) => ({ ...v, loading: false }));
      });
  }, [drawHeatmap, setHeatmapOverlay]);

  useEffect(() => {
    if (!canvasRef.current) {
      console.warn("[HeatmapOverlay] canvasRef is not defined");
      return;
    }

    updateHeatmap();

    return () => {};
  }, [canvasRef, heatmapOverlay.enabled, updateHeatmap]);

  useEffect(() => {
    if (heatmapOverlay.enabled) {
      console.debug("[HeatmapOverlay] subscribing to heatmap updates");
      network.subscribe("heatmap");
    } else {
      console.debug("[HeatmapOverlay] unsubscribing from heatmap updates");
      network.unsubscribe("heatmap");
    }

    network.on("heatmap", drawHeatmap);

    return () => {
      network.off("heatmap", drawHeatmap);
    };
  }, [drawHeatmap, heatmapOverlay.enabled]);

  return (
    <canvas
      id="heatmap-overlay"
      className="board-overlay no-interact pixelate"
      ref={(r) => (canvasRef.current = r)}
      width="1000"
      height="1000"
      style={{
        display: heatmapOverlay.enabled ? "block" : "none",
        opacity: heatmapOverlay.opacity.toFixed(1),
      }}
    />
  );
};
