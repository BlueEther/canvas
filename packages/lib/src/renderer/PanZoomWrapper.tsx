import React, { useRef, useState, useEffect } from "react";
import { RendererContext } from "./RendererContext";
import { PanZoom } from "./PanZoom";

export const PanZoomWrapper = ({ children }: { children: React.ReactNode }) => {
  const wrapper = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const move = useRef<HTMLDivElement>(null);

  const instance = useRef(new PanZoom()).current;

  useEffect(() => {
    const $wrapper = wrapper.current;
    const $zoom = zoom.current;
    const $move = move.current;

    if ($wrapper && $zoom && $move) {
      instance.initialize($wrapper, $zoom, $move);
    }

    return () => {
      instance.cleanup();
    };
  }, []);

  return (
    <RendererContext.Provider value={instance}>
      <div
        ref={wrapper}
        className="board-wrapper"
        style={{ touchAction: "none" }}
      >
        <div ref={zoom} className="board-zoom">
          <div ref={move} className="board-move">
            {children}
          </div>
        </div>
      </div>
    </RendererContext.Provider>
  );
};
