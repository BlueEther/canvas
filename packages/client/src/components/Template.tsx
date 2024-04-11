import { useEffect, useRef } from "react";
import { Template as TemplateCl } from "../lib/template";
import { useAppContext } from "../contexts/AppContext";
import { useTemplateContext } from "../contexts/TemplateContext";

export const Template = () => {
  const { config } = useAppContext();
  const { enable, url, width, setWidth, x, y, opacity } = useTemplateContext();
  const templateHolder = useRef<HTMLDivElement>(null);
  const instance = useRef<TemplateCl>();

  useEffect(() => {
    if (!templateHolder?.current) {
      console.warn("No templateHolder, cannot initialize");
      return;
    }

    instance.current = new TemplateCl(config, templateHolder.current);

    instance.current.on("autoDetectWidth", (width) => {
      console.log("autodetectwidth", width);
      setWidth(width);
    });

    return () => {
      instance.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!instance.current) {
      console.warn("Received template enable but no instance exists");
      return;
    }

    instance.current.setOption("enable", enable);

    if (enable && url) {
      instance.current.loadImage(url).then(() => {
        console.log("enable: load image finished");
      });
    }
  }, [enable]);

  useEffect(() => {
    if (!instance.current) {
      console.warn(
        "recieved template url update but no template instance exists"
      );
      return;
    }

    if (!url) {
      console.warn("received template url blank");
      return;
    }

    if (!enable) {
      console.info("Got template URL but not enabled, ignoring");
      return;
    }

    instance.current.loadImage(url).then(() => {
      console.log("template loader finished");
    });
  }, [url]);

  useEffect(() => {
    if (!instance.current) {
      console.warn("received template width with no instance");
      return;
    }

    instance.current.setOption("width", width);
    instance.current.rasterizeTemplate();
  }, [width]);

  return (
    <div
      id="template"
      ref={templateHolder}
      style={{
        top: y,
        left: x,
        opacity: opacity / 100,
      }}
    ></div>
  );
};
