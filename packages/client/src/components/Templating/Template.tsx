import { useEffect, useRef } from "react";
import { Template as TemplateCl } from "../../lib/template";
import { useAppContext } from "../../contexts/AppContext";
import { useTemplateContext } from "../../contexts/TemplateContext";
import { Canvas } from "../../lib/canvas";

export const Template = () => {
  const { config } = useAppContext();
  const { enable, url, width, setWidth, x, y, opacity, setX, setY, style } =
    useTemplateContext();
  const templateHolder = useRef<HTMLDivElement>(null);
  const instance = useRef<TemplateCl>();

  useEffect(() => {
    if (!templateHolder?.current) {
      console.warn("No templateHolder, cannot initialize");
      return;
    }

    const templateHolderRef = templateHolder.current;

    instance.current = new TemplateCl(config!, templateHolder.current);

    instance.current.on("autoDetectWidth", (width) => {
      setWidth(width);
    });

    let startLocation: { clientX: number; clientY: number } | undefined;
    let offset: [x: number, y: number] = [0, 0];

    const handleMouseDown = (e: MouseEvent) => {
      if (!e.altKey) return;

      startLocation = { clientX: e.clientX, clientY: e.clientY };
      offset = [e.offsetX, e.offsetY];
      Canvas.instance?.getPanZoom().panning.setEnabled(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!startLocation) return;
      if (!Canvas.instance) {
        console.warn(
          "[Template#handleMouseMove] Canvas.instance is not defined"
        );
        return;
      }

      const deltaX = e.clientX - startLocation.clientX;
      const deltaY = e.clientY - startLocation.clientY;
      const newX = startLocation.clientX + deltaX;
      const newY = startLocation.clientY + deltaY;

      const [canvasX, canvasY] = Canvas.instance.screenToPos(newX, newY);

      templateHolderRef.style.setProperty("left", canvasX - offset[0] + "px");
      templateHolderRef.style.setProperty("top", canvasY - offset[1] + "px");
    };

    const handleMouseUp = (e: MouseEvent) => {
      startLocation = undefined;
      Canvas.instance?.getPanZoom().panning.setEnabled(true);

      const x = parseInt(
        templateHolderRef.style.getPropertyValue("left").replace("px", "") ||
          "0"
      );
      const y = parseInt(
        templateHolderRef.style.getPropertyValue("top").replace("px", "") || "0"
      );

      setX(x);
      setY(y);
    };

    templateHolder.current.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      instance.current?.destroy();

      templateHolderRef?.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!instance.current) {
      console.warn(
        "[Template] Received template enable but no instance exists"
      );
      return;
    }

    instance.current.setOption("enable", enable);

    if (enable && url) {
      instance.current.loadImage(url).then(() => {
        console.log("[Template] enable: load image finished");
      });
    }
  }, [enable]);

  useEffect(() => {
    if (!instance.current) {
      console.warn(
        "[Template] Recieved template url update but no template instance exists"
      );
      return;
    }

    if (!url) {
      console.warn("[Template] Received template url blank");
      return;
    }

    if (!enable) {
      console.info("[Template] Got template URL but not enabled, ignoring");
      return;
    }

    instance.current.loadImage(url).then(() => {
      console.log("[Template] Template loader finished");
    });
  }, [url]);

  useEffect(() => {
    if (!instance.current) {
      console.warn("[Template] Received template width with no instance");
      return;
    }

    instance.current.setOption("width", width);
    instance.current.rasterizeTemplate();
  }, [width]);

  useEffect(() => {
    if (!instance.current) {
      console.warn("[Template] Received style update with no instance");
      return;
    }

    instance.current.setOption("style", style);
  }, [style]);

  return (
    <div
      id="template"
      className="board-overlay"
      ref={templateHolder}
      style={{
        top: y,
        left: x,
        opacity: opacity / 100,
      }}
    ></div>
  );
};
