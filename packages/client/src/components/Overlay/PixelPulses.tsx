import { CSSProperties, useEffect, useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import network from "../../lib/network";
import { Pixel } from "@sc07-canvas/lib/src/net";
import { Canvas } from "../../lib/canvas";

export const PixelPulses = () => {
  const { pixelPulses } = useAppContext();
  const [pulses, setPulses] = useState<JSX.Element[]>([]);

  useEffect(() => {
    network.on("pixel", handlePixel);

    return () => {
      network.off("pixel", handlePixel);
    };
  }, []);

  function handlePixel({ x, y, color }: Pixel) {
    if (!pixelPulses) {
      return;
    }

    const pulseStyle: CSSProperties = {
      position: "absolute",
      zIndex: "100",
      left: x + "px",
      top: y + "px",
      width: "50px",
      height: "50px",
      border: `1px solid ${Canvas.instance?.Pallete.getColor(color)?.hex}`,
      borderRadius: "100px",
      transform: "translate(-24.5px, -24.5px)",
      animationName: "pixel-pulse",
      animationDuration: "4s",
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
    }, 3700);
  }

  return <div>{pulses}</div>;
};
