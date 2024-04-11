import { PropsWithChildren, createContext, useContext, useState } from "react";

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
  const [enable, setEnable] = useState(false);
  const [url, setURL] = useState<string>();
  const [width, setWidth] = useState<number>();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [opacity, setOpacity] = useState(100);

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
