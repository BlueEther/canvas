import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { IRouterData, Router } from "../lib/router";

interface ITemplate {
  /**
   * If the template is being used
   */
  enable: boolean;

  /**
   * URL of the template image being used
   */
  url?: string;

  /**
   * Width of the template being displayed
   *
   * @default min(template.width,canvas.width)
   */
  width?: number;

  x: number;
  y: number;
  opacity: number;

  setEnable(v: boolean): void;
  setURL(v?: string): void;
  setWidth(v?: number): void;
  setX(v: number): void;
  setY(v: number): void;
  setOpacity(v: number): void;
}

const templateContext = createContext<ITemplate>({} as any);

export const useTemplateContext = () => useContext(templateContext);

export const TemplateContext = ({ children }: PropsWithChildren) => {
  const routerData = Router.get();
  const [enable, setEnable] = useState(!!routerData.template?.url);
  const [url, setURL] = useState<string | undefined>(routerData.template?.url);
  const [width, setWidth] = useState<number | undefined>(
    routerData.template?.width
  );
  const [x, setX] = useState(routerData.template?.x || 0);
  const [y, setY] = useState(routerData.template?.y || 0);
  const [opacity, setOpacity] = useState(100);

  const initAt = useRef<number>();

  useEffect(() => {
    initAt.current = Date.now();

    const handleNavigate = (data: IRouterData) => {
      if (data.template) {
        setEnable(true);
        setURL(data.template.url);
        setWidth(data.template.width);
        setX(data.template.x || 0);
        setY(data.template.y || 0);
      } else {
        setEnable(false);
      }
    };

    Router.on("navigate", handleNavigate);

    return () => {
      Router.off("navigate", handleNavigate);
    };
  }, []);

  useEffect(() => {
    Router.setTemplate({ enabled: enable, width, x, y, url });

    if (!initAt.current) {
      console.debug("TemplateContext updating router but no initAt");
    } else if (Date.now() - initAt.current < 2 * 1000) {
      console.debug(
        "TemplateContext updating router too soon after init",
        Date.now() - initAt.current
      );
    }

    if (initAt.current && Date.now() - initAt.current > 2 * 1000)
      Router.queueUpdate();
  }, [enable, width, x, y, url]);

  return (
    <templateContext.Provider
      value={{
        enable,
        setEnable,
        url,
        setURL,
        width,
        setWidth,
        x,
        setX,
        y,
        setY,
        opacity,
        setOpacity,
      }}
    >
      {children}
    </templateContext.Provider>
  );
};
