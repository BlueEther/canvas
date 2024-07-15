import { CSSProperties, useEffect, useState } from "react";
import { useAppContext } from "../../contexts/AppContext";
import network from "../../lib/network";
import { Pixel } from "@sc07-canvas/lib/src/net";
import { Canvas } from "../../lib/canvas";
import { motion } from "framer-motion";

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
      left: x + "px",
      top: y + "px",
      border: `1px solid #${Canvas.instance?.Pallete.getColor(color)?.hex}`,
      borderRadius: "100px",
      transform: "translate(-24.5px, -24.5px)",
      animationDuration: "4s",
      width: "50px",
      height: "50px"
    };

    // used in the case of two pixels coming through for the same position
    // rare, but causes issues with react
    // even if the pixels are close to eachother, the ms will be different
    const timestamp = Date.now();

    const pulseElement = (
      <motion.div 
        key={`${x}-${y}-${timestamp}`} 
        style={pulseStyle}
        animate={{
          width: "10px",
          height: "10px",
          transform: "translate(-4.5px, -4.5px)",
          transition: {
            duration: 4,
          },
        }}
      />
    );

    setPulses((prevPulses) => [...prevPulses, pulseElement]);

    setTimeout(_ => {
      setPulses(prevPulses => prevPulses.slice(1))
    }, 3700)
  }

  return <div>{pulses}</div>;
};
