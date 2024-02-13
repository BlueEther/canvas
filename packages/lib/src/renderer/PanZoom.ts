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
  scale: number;
  x: number;
  y: number;
}

interface Flags {
  useZoom: boolean;
}

interface TouchState {
  lastTouch: number | null;
  pinchStartDistance: number | null;
  lastDistance: number | null;
  pinchStartScale: number | null;
  pinchMidpoint: { x: number; y: number } | null;
}

interface MouseState {}

interface ISetup {
  scale: [number, number];
}

interface PanZoomEvents {
  doubleTap: (e: TouchEvent) => void;
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

    this.mouse = {};

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

        this.panning.start(e.clientX, e.clientY);
      },
      { passive: false }
    );

    this.$wrapper.addEventListener(
      "mousemove",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!this.panning.enabled) return;

        this.panning.move(e.clientX, e.clientY);
      },
      { passive: false }
    );

    this.$wrapper.addEventListener(
      "mouseup",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.panning.end(e.clientX, e.clientY);
      },
      { passive: false }
    );
  }

  update() {
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
