import { ICanvasPosition } from "@sc07-canvas/lib/src/net";

export interface ITemplateState {
  url: string;
  width: number;
  x: number;
  y: number;
  opacity: number;
}

export const Routes = {
  canvas: ({
    pos,
    template,
  }: {
    pos?: ICanvasPosition;
    template?: ITemplateState;
  }) => {
    const params = new URLSearchParams();

    if (pos) {
      params.set("x", pos.x + "");
      params.set("y", pos.y + "");
      params.set("zoom", pos.zoom + "");
    }

    if (template) {
      let { url, width, x, y, opacity } = template;
      params.set("template.url", url);
      params.set("template.width", width + "");
      params.set("template.x", x + "");
      params.set("template.y", y + "");
      params.set("template.opacity", opacity + "");
    }

    return "/#" + params;
  },
};
