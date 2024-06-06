import EventEmitter from "eventemitter3";
import {
  calculatePinchZoom,
  calculateTouchMidPoint,
  getTouchDistance,
} from "./lib/pinch.utils";
import {
  checkZoomBounds,
  handleCalculateZoomPositions,
} from "./lib/zoom.utils";
import { Panning } from "./lib/panning.utils";
import { Debug } from "../debug";

interface TransformState {
  /**
   * Zoom scale
   *
   * < 0 : zoomed out
   * > 0 : zoomed in
   */
  scale: number;

  /**
   * X position of canvas
   */
  x: number;

  /**
   * Y position of canvas
   */
  y: number;
}

interface Flags {
  /**
   * If CSS Zoom is used
   *
   * CSS Zoom is not supported on Firefox, as it's not a standard
   * But on iOS, <canvas> is fuzzy (ignoring other css rules) when transform: scale()'d up
   *
   * @see https://caniuse.com/css-zoom
   */
  useZoom: boolean;
}

interface TouchState {
  /**
   * Timestamp of last touch
   */
  lastTouch: number | null;

  /**
   * Distance between each finger when pinch starts
   */
  pinchStartDistance: number | null;

  /**
   * previous distance between each finger
   */
  lastDistance: number | null;

  /**
   * scale when pinch starts
   */
  pinchStartScale: number | null;

  /**
   * middle coord of pinch
   */
  pinchMidpoint: { x: number; y: number } | null;
}

interface MouseState {
  /**
   * timestamp of mouse down
   */
  mouseDown: number | null;
}

interface ISetup {
  /**
   * Scale limits
   * [minimum scale, maximum scale]
   */
  scale: [number, number];

  initialTransform?: TransformState;
}

// TODO: move these event interfaces out
export interface ClickEvent {
  button: "LCLICK" | "MCLICK" | "RCLICK";

  clientX: number;
  clientY: number;

  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

export interface HoverEvent {
  clientX: number;
  clientY: number;
}

export interface ViewportMoveEvent {
  scale: number;
  x: number;
  y: number;
}

interface PanZoomEvents {
  longPress: (x: number, y: number) => void;
  doubleTap: (e: TouchEvent) => void;
  click: (e: ClickEvent) => void;
  hover: (e: HoverEvent) => void;
  viewportMove: (e: ViewportMoveEvent) => void;
  initialize: () => void;
}

export class PanZoom extends EventEmitter<PanZoomEvents> {
  private initialized = false;

  public $wrapper: HTMLDivElement = null as any;
  public $zoom: HTMLDivElement = null as any;
  public $move: HTMLDivElement = null as any;

  public transform: TransformState;
  public touch: TouchState;
  public mouse: MouseState;
  public setup: ISetup;
  public flags: Flags;

  public panning: Panning;

  constructor() {
    super();

    this.transform = {
      scale: 1,
      x: 0,
      y: 0,
    };

    this.touch = {
      lastTouch: null,
      pinchStartDistance: null,
      lastDistance: null,
      pinchStartScale: null,
      pinchMidpoint: null,
    };

    this.mouse = {
      mouseDown: null,
    };

    this.panning = new Panning(this);

    this.setup = {
      scale: [1, 50],
    };

    this.flags = {
      useZoom: false,
    };
  }

  initialize(
    $wrapper: HTMLDivElement,
    $zoom: HTMLDivElement,
    $move: HTMLDivElement
  ) {
    this.$wrapper = $wrapper;
    this.$zoom = $zoom;
    this.$move = $move;

    this.detectFlags();
    this.registerMouseEvents();
    this.registerTouchEvents();

    this.initialized = true;

    if (this.setup.initialTransform) {
      // use initial transform if it is set
      // initialTransform is set from #setPosition() when PanZoom is not initalized

      let { x, y, scale } = this.setup.initialTransform;

      this.transform.x = x;
      this.transform.y = y;
      this.transform.scale = scale;
      this.update({ suppressEmit: true });
    }

    this.emit("initialize");
  }

  /**
   * Get scale that would fit the zoom element in the viewport
   * @returns
   */
  getZoomToFit() {
    // https://github.com/BetterTyped/react-zoom-pan-pinch/blob/8dacc2746ca84db22f30275e0745c04aefde5aea/src/core/handlers/handlers.utils.ts#L141
    // const wrapperRect = this.$wrapper.getBoundingClientRect();
    const nodeRect = this.$zoom.getBoundingClientRect();
    // const nodeOffset = this._getOffset();

    // const nodeLeft = nodeOffset.x;
    // const nodeTop = nodeOffset.y;
    const nodeWidth = nodeRect.width / this.transform.scale;
    const nodeHeight = nodeRect.height / this.transform.scale;

    const scaleX = this.$wrapper.offsetWidth / nodeWidth;
    const scaleY = this.$wrapper.offsetHeight / nodeHeight;

    const newScale = Math.min(scaleX, scaleY);

    return newScale;

    // the following is from the zoomToElement from react-zoom-pan-pinch

    // const offsetX = (wrapperRect.width - nodeWidth * newScale) / 2;
    // const offsetY = (wrapperRect.height - nodeHeight * newScale) / 2;

    // const newPositionX = (wrapperRect.left - nodeLeft) * newScale + offsetX;
    // const newPositionY = (wrapperRect.top - nodeTop) * newScale + offsetY;
  }

  // https://github.com/BetterTyped/react-zoom-pan-pinch/blob/8dacc2746ca84db22f30275e0745c04aefde5aea/src/core/handlers/handlers.utils.ts#L122
  _getOffset() {
    const wrapperOffset = this.$wrapper.getBoundingClientRect();
    const contentOffset = this.$zoom.getBoundingClientRect();

    const xOff = wrapperOffset.x * this.transform.scale;
    const yOff = wrapperOffset.y * this.transform.scale;

    return {
      x: (contentOffset.x + xOff) / this.transform.scale,
      y: (contentOffset.y + yOff) / this.transform.scale,
    };
  }

  /**
   * Sets transform data
   *
   * @param position
   * @param position.x Transform X
   * @param position.y Transform Y
   * @param position.zoom Zoom scale
   * @param flags
   * @param flags.suppressEmit If true, don't emit a viewport change
   * @returns
   */
  setPosition(
    { x, y, zoom }: { x: number; y: number; zoom: number },
    { suppressEmit } = { suppressEmit: false }
  ) {
    if (!this.initialized) {
      // elements are not yet available, store them to be used upon initialization
      this.setup.initialTransform = {
        x,
        y,
        scale: zoom,
      };
      return;
    }

    this.transform.x = x;
    this.transform.y = y;
    this.transform.scale = zoom;
    this.update({ suppressEmit });
  }

  detectFlags() {
    // Pxls/resources/public/include/helpers.js
    let haveZoomRendering = false;
    let haveImageRendering = false;
    const webkitBased = navigator.userAgent.match(/AppleWebKit/i);
    const iOSSafari =
      navigator.userAgent.match(/(iPod|iPhone|iPad)/i) && webkitBased;
    const desktopSafari =
      navigator.userAgent.match(/safari/i) &&
      !navigator.userAgent.match(/chrome/i);
    const msEdge = navigator.userAgent.indexOf("Edge") > -1;
    const possiblyMobile =
      window.innerWidth < 768 && navigator.userAgent.includes("Mobile");
    if (iOSSafari) {
      const iOS =
        parseFloat(
          (
            "" +
            (/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(
              navigator.userAgent
            ) || [0, ""])[1]
          )
            .replace("undefined", "3_2")
            .replace("_", ".")
            .replace("_", "")
        ) || false;
      haveImageRendering = false;
      if (iOS && iOS >= 11) {
        haveZoomRendering = true;
      }
    } else if (desktopSafari) {
      haveImageRendering = false;
      haveZoomRendering = true;
    }
    if (msEdge) {
      haveImageRendering = false;
    }

    this.flags.useZoom = haveZoomRendering;
  }

  registerTouchEvents() {
    console.debug("[PanZoom] Registering touch events to $wrapper");

    this.$wrapper.addEventListener(
      "touchstart",
      this._touch_touchstart.bind(this),
      {
        passive: false,
      }
    );

    this.$wrapper.addEventListener(
      "touchmove",
      this._touch_touchmove.bind(this)
    );

    this.$wrapper.addEventListener("touchend", this._touch_touchend.bind(this));
  }

  unregisterTouchEvents() {
    console.debug("[PanZoom] Unregistering touch events to $wrapper");

    this.$wrapper.removeEventListener(
      "touchstart",
      this._touch_touchstart.bind(this)
    );
    this.$wrapper.removeEventListener(
      "touchmove",
      this._touch_touchmove.bind(this)
    );
    this.$wrapper.removeEventListener(
      "touchend",
      this._touch_touchend.bind(this)
    );
  }

  /**
   * Handle touchstart event from touch registrations
   * This needs to be a variable to correctly pass this context
   *
   * @param e
   */
  private _touch_touchstart = (event: TouchEvent) => {
    event.preventDefault();

    const isDoubleTap =
      this.touch.lastTouch && +new Date() - this.touch.lastTouch < 200;

    if (isDoubleTap && event.touches.length === 1) {
      this.emit("doubleTap", event);
    } else {
      this.touch.lastTouch = +new Date();

      const { touches } = event;

      const isPanningAction = touches.length === 1;
      const isPinchAction = touches.length === 2;

      if (isPanningAction) {
        this.panning.start(touches[0].clientX, touches[0].clientY);
      }
      if (isPinchAction) {
        this.onPinchStart(event);
      }
    }
  };

  /**
   * Handle touchmove event from touch registrations
   * This needs to be a variable to correctly pass this context
   *
   * @param e
   */
  private _touch_touchmove = (event: TouchEvent) => {
    if (this.panning.active && event.touches.length === 1) {
      event.preventDefault();
      event.stopPropagation();

      const touch = event.touches[0];

      this.panning.move(touch.clientX, touch.clientY);
    } else if (event.touches.length > 1) {
      this.onPinch(event);
    }
  };

  /**
   * Handle touchend event from touch registrations
   * This needs to be a variable to correctly pass this context
   *
   * @param e
   */
  private _touch_touchend = (event: TouchEvent) => {
    if (this.touch.lastTouch && this.panning.active) {
      const touch = event.changedTouches[0];
      const dx = Math.abs(this.panning.x - touch.clientX);
      const dy = Math.abs(this.panning.y - touch.clientY);

      if (Date.now() - this.touch.lastTouch > 500 && dx < 25 && dy < 25) {
        this.emit("longPress", this.panning.x, this.panning.y);
      }
    }

    if (this.panning.active) {
      this.panning.active = false;

      const touch = event.changedTouches[0];

      this.panning.end(touch.clientX, touch.clientY);
    }
  };

  /// /////
  // pinch
  /// /////

  onPinchStart(event: TouchEvent) {
    const distance = getTouchDistance(event);

    this.touch.pinchStartDistance = distance;
    this.touch.lastDistance = distance;
    this.touch.pinchStartScale = this.transform.scale;
    this.panning.active = false;
  }

  onPinch(event: TouchEvent) {
    event.preventDefault();
    event.stopPropagation();

    const { scale } = this.transform;

    // one finger started from outside the wrapper
    if (this.touch.pinchStartDistance === null) return;

    let el: HTMLElement = document.body;
    // switch (
    //   (document.getElementById("test-flag")! as HTMLSelectElement).value
    // ) {
    //   case "body":
    //     el = document.body;
    //     break;
    //   case "wrapper":
    //     el = this.$wrapper;
    //     break;
    //   case "move":
    //     el = this.$move;
    //     break;
    //   default:
    //   case "zoom":
    //     el = this.$zoom;
    //     break;
    // }

    const midPoint = calculateTouchMidPoint(this, event, scale, el);

    if (!Number.isFinite(midPoint.x) || !Number.isFinite(midPoint.y)) return;

    const currentDistance = getTouchDistance(event);
    const newScale = calculatePinchZoom(this, currentDistance);

    if (newScale === scale) return;

    // this returns diff of pixels due to css zoom being used
    //
    // let { x, y } = handleCalculateZoomPositions(
    //   this,
    //   midPoint.x,
    //   midPoint.y,
    //   newScale
    // );

    this.touch.pinchMidpoint = midPoint;
    this.touch.lastDistance = currentDistance;

    if (Debug.flags.enabled("PANZOOM_PINCH_DEBUG_MESSAGES")) {
      Debug.debug("point", midPoint.x, midPoint.y, "midpoint");
      Debug.debug("text", {
        scale: [scale, newScale],
        x: midPoint.x,
        y: midPoint.y,
        tx: this.transform.x,
        ty: this.transform.y,
        xx: midPoint.x * newScale - midPoint.x * scale,
        yy: midPoint.y * newScale - midPoint.y * scale,
      });
    }

    // TODO: this might be css zoom specific, I have no way to test this
    if (Debug.flags.enabled("PANZOOM_PINCH_TRANSFORM_1")) {
      this.transform.x = midPoint.x / newScale - midPoint.x / scale;
      this.transform.y = midPoint.y / newScale - midPoint.y / scale;
    }
    if (Debug.flags.enabled("PANZOOM_PINCH_TRANSFORM_2")) {
      this.transform.x = (midPoint.x - this.transform.x) / (newScale - scale);
      this.transform.y = (midPoint.y - this.transform.y) / (newScale - scale);
    }
    this.transform.scale = newScale;
    this.update();
  }

  registerMouseEvents() {
    console.debug("[PanZoom] Registering mouse events to $wrapper & document");

    // zoom
    this.$wrapper.addEventListener("wheel", this._mouse_wheel, {
      passive: true,
    });

    this.$wrapper.addEventListener("mousedown", this._mouse_mousedown, {
      passive: false,
    });

    // mouse move should not be tied to the element, in case the mouse exits the window
    document.addEventListener("mousemove", this._mouse_mousemove, {
      passive: false,
    });

    // mouse up should not be tied to the element, in case the mouse releases outside of the window
    document.addEventListener("mouseup", this._mouse_mouseup, {
      passive: false,
    });
  }

  unregisterMouseEvents() {
    console.debug(
      "[PanZoom] Unregistering mouse events to $wrapper & document"
    );

    this.$wrapper.removeEventListener("wheel", this._mouse_wheel);

    this.$wrapper.removeEventListener("mousedown", this._mouse_mousedown);

    document.removeEventListener("mousemove", this._mouse_mousemove);

    document.removeEventListener("mouseup", this._mouse_mouseup);
  }

  /**
   * Handle the wheel event from the mouse event registration
   * This needs to be a variable to correctly pass this context
   *
   * @param e
   */
  private _mouse_wheel = (e: WheelEvent) => {
    // if (!self.allowDrag) return;
    const oldScale = this.transform.scale;

    let delta = -e.deltaY;

    switch (e.deltaMode) {
      case WheelEvent.DOM_DELTA_PIXEL:
        // 53 pixels is the default chrome gives for a wheel scroll.
        delta /= 53;
        break;
      case WheelEvent.DOM_DELTA_LINE:
        // default case on Firefox, three lines is default number.
        delta /= 3;
        break;
      case WheelEvent.DOM_DELTA_PAGE:
        delta = Math.sign(delta);
        break;
    }

    // TODO: move this to settings
    this.nudgeScale(delta / 2);

    const scale = this.transform.scale;
    if (oldScale !== scale) {
      const dx = e.clientX - this.$wrapper.clientWidth / 2;
      const dy = e.clientY - this.$wrapper.clientHeight / 2;
      this.transform.x -= dx / oldScale;
      this.transform.x += dx / scale;
      this.transform.y -= dy / oldScale;
      this.transform.y += dy / scale;
      this.update();
      // place.update();
    }
  };

  /**
   * Handle mousedown event from mouse registrations
   * This needs to be a variable to correctly pass this context
   *
   * @param e
   */
  private _mouse_mousedown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    this.mouse.mouseDown = Date.now();

    if (this.panning.enabled) {
      this.panning.start(e.clientX, e.clientY);
    }
  };

  /**
   * Handle mousemove event from mouse registrations
   * This needs to be a variable to correctly pass this context
   *
   * @param e
   */
  private _mouse_mousemove = (e: MouseEvent) => {
    if (this.panning.active) {
      e.preventDefault();
      e.stopPropagation();

      this.panning.move(e.clientX, e.clientY);
    } else {
      // not panning
      this.emit("hover", {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }
  };

  /**
   * Handle mouseup event from mouse registrations
   * This needs to be a variable to correctly pass this context
   *
   * @param e
   */
  private _mouse_mouseup = (e: MouseEvent) => {
    if (this.mouse.mouseDown && Date.now() - this.mouse.mouseDown <= 500) {
      // if the mouse was down for less than a half a second, it's a click
      // this can't depend on this.panning.enabled because that'll always be true when mouse is down

      const delta = [
        Math.abs(this.panning.x - e.clientX),
        Math.abs(this.panning.y - e.clientY),
      ];

      if (delta[0] < 5 && delta[1] < 5) {
        // difference from the start position to the up position is very very slow,
        // so it's most likely intended to be a click
        this.emit("click", {
          button: ["LCLICK", "MCLICK", "RCLICK"][e.button] as any,

          clientX: e.clientX,
          clientY: e.clientY,

          alt: e.altKey,
          ctrl: e.ctrlKey,
          meta: e.metaKey,
          shift: e.shiftKey,
        });
      }
    }

    if (this.panning.active) {
      // currently panning
      e.preventDefault();
      e.stopPropagation();

      this.panning.end(e.clientX, e.clientY);
    }
  };

  /**
   * Update viewport scale and position
   *
   * @param flags
   * @param flags.suppressEmit Do not emit viewportMove
   */
  update(
    {
      suppressEmit,
    }: {
      suppressEmit: boolean;
    } = {
      suppressEmit: false,
    }
  ) {
    if (!suppressEmit) {
      this.emit("viewportMove", {
        scale: this.transform.scale,
        x: this.transform.x,
        y: this.transform.y,
      });
    }

    if (this.flags.useZoom) {
      this.$zoom.style.setProperty("zoom", this.transform.scale * 100 + "%");
    } else {
      this.$zoom.style.setProperty(
        "transform",
        `scale(${this.transform.scale})`
      );
    }

    this.$move.style.setProperty(
      "transform",
      `translate(${this.transform.x}px, ${this.transform.y}px)`
    );
  }

  cleanup() {
    // remove event handlers

    this.unregisterTouchEvents();
    this.unregisterMouseEvents();
  }

  // utilities

  nudgeScale(adj: number) {
    this.transform.scale = checkZoomBounds(
      this.transform.scale * 1.5 ** adj,
      this.setup.scale[0],
      this.setup.scale[1]
    );
  }
}
