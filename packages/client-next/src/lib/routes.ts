import { ICanvasPosition } from "../types";

export const Routes = {
  canvas: (pos: ICanvasPosition) => {
    const params = new URLSearchParams();
    params.set("x", pos.x + "");
    params.set("y", pos.y + "");
    params.set("zoom", pos.zoom + "");

    return "/#" + params;
  },
};
