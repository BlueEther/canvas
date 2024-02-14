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
}

// TODO: move these event interfaces out
export interface ClickEvent {
  clientX: number;
  clientY: number;
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
  doubleTap: (e: TouchEvent) => void;
  click: (e: ClickEvent) => void;
  hover: (e: HoverEvent) => void;
  viewportMove: (e: ViewportMoveEvent) => void;
}

export class PanZoom extends EventEmitter<PanZoomEvents> {
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
    this.$wrapper.addEventListener(
      "touchstart",
      (event) => {
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
      },
      { passive: false }
    );

    this.$wrapper.addEventListener("touchmove", (event) => {
      if (this.panning.enabled && event.touches.length === 1) {
        event.preventDefault();
        event.stopPropagation();

        const touch = event.touches[0];

        this.panning.move(touch.clientX, touch.clientY);
      } else if (event.touches.length > 1) {
        this.onPinch(event);
      }
    });

    this.$wrapper.addEventListener("touchend", (event) => {
      if (this.panning.enabled) {
        this.panning.enabled = false;

        const touch = event.changedTouches[0];

        this.panning.end(touch.clientX, touch.clientY);
      }
    });
  }

  /// /////
  // pinch
  /// /////

  onPinchStart(event: TouchEvent) {
    const distance = getTouchDistance(event);

    this.touch.pinchStartDistance = distance;
    this.touch.lastDistance = distance;
    this.touch.pinchStartScale = this.transform.scale;
    this.panning.enabled = false;
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

    const { x, y } = handleCalculateZoomPositions(
      this,
      midPoint.x,
      midPoint.y,
      newScale
    );

    this.touch.pinchMidpoint = midPoint;
    this.touch.lastDistance = currentDistance;

    this.debug(midPoint.x, midPoint.y, "midpoint");

    // TODO: this might be css zoom specific, I have no way to test this
    this.transform.x = midPoint.x / newScale - midPoint.x / scale;
    this.transform.y = midPoint.y / newScale - midPoint.x / scale;
    this.transform.scale = newScale;
    this.update();
  }

  debug(x: number, y: number, id?: string) {
    // if (document.getElementById("debug-" + id)) {
    //   document.getElementById("debug-" + id)!.style.top = y + "px";
    //   document.getElementById("debug-" + id)!.style.left = x + "px";
    //   return;
    // }
    // let el = document.createElement("div");
    // if (id) el.id = "debug-" + id;
    // el.classList.add("debug-point");
    // el.style.setProperty("top", y + "px");
    // el.style.setProperty("left", x + "px");
    // document.body.appendChild(el);
  }

  registerMouseEvents() {
    // zoom
    this.$wrapper.addEventListener(
      "wheel",
      (e) => {
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

        this.nudgeScale(delta);

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
      },
      { passive: true }
    );

    this.$wrapper.addEventListener(
      "mousedown",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.mouse.mouseDown = Date.now();

        this.panning.start(e.clientX, e.clientY);
      },
      { passive: false }
    );

    // mouse move should not be tied to the element, in case the mouse exits the window
    document.addEventListener(
      "mousemove",
      (e) => {
        if (this.panning.enabled) {
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
      },
      { passive: false }
    );

    // mouse up should not be tied to the element, in case the mouse releases outside of the window
    document.addEventListener(
      "mouseup",
      (e) => {
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
              clientX: e.clientX,
              clientY: e.clientY,
            });
          }
        }

        if (this.panning.enabled) {
          // currently panning
          e.preventDefault();
          e.stopPropagation();

          this.panning.end(e.clientX, e.clientY);
        }
      },
      { passive: false }
    );
  }

  update() {
    this.emit("viewportMove", {
      scale: this.transform.scale,
      x: this.transform.x,
      y: this.transform.y,
    });

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
