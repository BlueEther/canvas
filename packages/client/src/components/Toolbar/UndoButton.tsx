import { Button } from "@nextui-org/react";
import { useAppContext } from "../../contexts/AppContext";
import network from "../../lib/network";
import { useEffect, useState } from "react";

export const UndoButton = () => {
  const { undo, config } = useAppContext<true>();
  /**
   * percentage of time left (0 <= x <= 1)
   */
  const [progress, setProgress] = useState(0.5);

  useEffect(() => {
    if (!undo) {
      setProgress(1);
      return;
    }

    const timer = setInterval(() => {
      let diff = undo.expireAt - Date.now();
      let percentage = diff / config.canvas.undo.grace_period;
      setProgress(percentage);

      if (percentage <= 0) {
        clearInterval(timer);
      }
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [undo]);

  // ref-ify this?
  function execUndo() {
    network.socket.emitWithAck("undo").then((data) => {
      console.log("undo", data);
    });
  }

  return (
    <div
      className="absolute z-0"
      style={{
        top: undo?.available && progress >= 0 ? "-10px" : "100%",
        left: "50%",
        transform: "translateY(-100%) translateX(-50%)",
        transition: "all 0.25s ease-in-out",
      }}
    >
      <Button onPress={execUndo}>
        <span className="z-[1]">Undo</span>
        <div
          className="absolute top-0 left-0 h-full bg-white/50 transition-all"
          style={{ width: progress * 100 + "%" }}
        ></div>
      </Button>
    </div>
  );
};
