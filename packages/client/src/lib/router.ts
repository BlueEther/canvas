import { PanZoom } from "@sc07-canvas/lib/src/renderer/PanZoom";
import { Canvas } from "./canvas";
import throttle from "lodash.throttle";
import EventEmitter from "eventemitter3";
import { TemplateStyle, TemplateStyles } from "./template";

const CLIENT_PARAMS = {
  canvas_x: "x",
  canvas_y: "y",
  canvas_zoom: "zoom",
  template_url: "tu",
  template_width: "tw",
  template_x: "tx",
  template_y: "ty",
  template_style: "ts",
};

export interface IRouterData {
  canvas?: {
    x: number;
    y: number;
    zoom?: number;
  };
  template?: {
    url: string;
    width?: number;
    x?: number;
    y?: number;
    style?: TemplateStyle;
  };
}

interface RouterEvents {
  navigate(route: IRouterData): void;
}

class _Router extends EventEmitter<RouterEvents> {
  PanZoom: PanZoom | undefined;

  // React TemplateContext
  templateState: {
    enabled: boolean;
    width?: number;
    x: number;
    y: number;
    url?: string;
    style: TemplateStyle;
  } = {
    enabled: false,
    x: 0,
    y: 0,
    style: "ONE_TO_ONE",
  };

  constructor() {
    super();

    window.addEventListener("hashchange", this._hashChange.bind(this));
  }

  destroy() {
    // NOTE: this method *never* gets called because this is intended to be global
    window.removeEventListener("hashchange", this._hashChange.bind(this));
  }

  _hashChange(e: HashChangeEvent) {
    const data = this.get();
    console.info("[Router] Navigated", data);
    this.emit("navigate", data);
  }

  queueUpdate = throttle(this.update, 500);

  update() {
    const url = this.getURL();
    if (!url) return;

    console.log("[Router] Updating URL", url);
    window.history.replaceState({}, "", url);
  }

  getURL() {
    const canvas = Canvas.instance;
    // this is not that helpful because the data is more spread out
    // this gets replaced by using TemplateContext data
    // const template = Template.instance;

    if (!canvas) {
      console.warn("Router#update called but no canvas instance exists");
      return;
    }

    if (!this.PanZoom) {
      console.warn("Router#update called but no PanZoom instance exists");
    }

    const params = new URLSearchParams();

    const position = canvas.panZoomTransformToCanvas();
    params.set(CLIENT_PARAMS.canvas_x, position.canvasX + "");
    params.set(CLIENT_PARAMS.canvas_y, position.canvasY + "");
    params.set(
      CLIENT_PARAMS.canvas_zoom,
      (this.PanZoom!.transform.scale >> 0) + ""
    );

    if (this.templateState.enabled && this.templateState.url) {
      params.set(CLIENT_PARAMS.template_url, this.templateState.url + "");
      if (this.templateState.width)
        params.set(CLIENT_PARAMS.template_width, this.templateState.width + "");
      params.set(CLIENT_PARAMS.template_x, this.templateState.x + "");
      params.set(CLIENT_PARAMS.template_y, this.templateState.y + "");
      if (this.templateState.style)
        params.set(CLIENT_PARAMS.template_style, this.templateState.style + "");
    }

    return (
      window.location.protocol + "//" + window.location.host + "/#" + params
    );
  }

  /**
   * Parse the URL and return what was found, following specifications
   * There's no defaults, if it's not specified in the url, it's not specified in the return
   *
   * @returns
   */
  get(): IRouterData {
    const params = new URLSearchParams(window.location.hash.slice(1));

    let canvas:
      | {
          x: number;
          y: number;
          zoom?: number;
        }
      | undefined = undefined;

    if (
      params.has(CLIENT_PARAMS.canvas_x) &&
      params.has(CLIENT_PARAMS.canvas_y)
    ) {
      // params exist, now to validate
      // x & y or nothing; zoom is optional

      let x = parseInt(params.get(CLIENT_PARAMS.canvas_x) || "");
      let y = parseInt(params.get(CLIENT_PARAMS.canvas_y) || "");
      if (!isNaN(x) && !isNaN(y)) {
        // x & y are valid numbers
        canvas = {
          x,
          y,
        };

        if (params.has(CLIENT_PARAMS.canvas_zoom)) {
          let zoom = parseInt(params.get(CLIENT_PARAMS.canvas_zoom) || "");

          if (!isNaN(zoom)) {
            canvas.zoom = zoom;
          }
        }
      }
    }

    let template:
      | {
          url: string;
          width?: number;
          x?: number;
          y?: number;
          style?: TemplateStyle;
        }
      | undefined = undefined;

    if (params.has(CLIENT_PARAMS.template_url)) {
      const url = params.get(CLIENT_PARAMS.template_url)!;
      template = { url };

      if (params.has(CLIENT_PARAMS.template_width)) {
        let width = parseInt(params.get(CLIENT_PARAMS.template_width) || "");

        if (!isNaN(width)) {
          template.width = width;
        }
      }

      if (
        params.has(CLIENT_PARAMS.template_x) &&
        params.has(CLIENT_PARAMS.template_y)
      ) {
        // both x & y has to be set

        let x = parseInt(params.get(CLIENT_PARAMS.template_x) || "");
        let y = parseInt(params.get(CLIENT_PARAMS.template_y) || "");

        if (!isNaN(x) && !isNaN(y)) {
          template.x = x;
          template.y = y;
        }
      }

      if (params.has(CLIENT_PARAMS.template_style)) {
        let style = params.get(CLIENT_PARAMS.template_style);

        if (style && TemplateStyles.indexOf(style) > -1) {
          template.style = style as any;
        }
      }
    }

    return {
      canvas,
      template,
    };
  }

  /**
   * Accept updates to local copy of TemplateContext from React
   * @param args
   */
  setTemplate(args: {
    enabled: boolean;
    width?: number;
    x: number;
    y: number;
    url?: string;
    style: TemplateStyle;
  }) {
    this.templateState = args;
  }
}

export const Router = new _Router();
