import { CSSProperties, useEffect, useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import network from "../../lib/network";
import { Pixel } from "@sc07-canvas/lib/src/net";
import { Canvas } from "../../lib/canvas";

export const PixelPulses = () => {
  const { pixelPulses } = useAppContext();
  const [pulses, setPulses] = useState<JSX.Element[]>([]);

  useEffect(() => {
    function handlePixel({ x, y, color }: Pixel) {
      if (!pixelPulses) {
        return;
      }

      const paletteColor = Canvas.instance?.Pallete.getColor(color);

      const pulseStyle: CSSProperties = {
        position: "absolute",
        zIndex: "100",
        left: x + "px",
        top: y + "px",
        width: "50px",
        height: "50px",
        border: `1px solid #${paletteColor?.hex || "000"}`, // default to black in the case it fails to load, but that shouldn't happen
        borderRadius: "100px",
        transform: "translate(-24.5px, -24.5px)",
        animationName: "pixel-pulse",
        animationTimingFunction: "ease-in-out",
        animationDuration: "2s",
        animationFillMode: "forwards",
      };

      // used in the case of two pixels coming through for the same position
      // rare, but causes issues with react
      // even if the pixels are close to eachother, the ms will be different
      const timestamp = Date.now();

      const pulseElement = (
        <div key={`${x}-${y}-${timestamp}`} style={pulseStyle}></div>
      );

      setPulses((prevPulses) => [...prevPulses, pulseElement]);

      setTimeout(() => {
        setPulses((prevPulses) => prevPulses.slice(1)); // Remove the oldest pulse after 3700ms
      }, 2500);
    }

    network.on("pixel", handlePixel);

    return () => {
      network.off("pixel", handlePixel);
    };
  }, [pixelPulses]);

  return <div>{pulses}</div>;
};
