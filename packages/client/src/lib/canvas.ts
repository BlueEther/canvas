import pallete from "./pallete";
import Network from "./net";
import {
  CPixelPacket,
  SCanvasPacket,
  SPixelPacket,
} from "@sc07-canvas/lib/src/net";

const $moveContainer = document.querySelector("main")!;
const $canvas = document.getElementById("board")! as HTMLCanvasElement;
const $zoom = document.getElementById("board-zoom")!;
const $move = document.getElementById("board-move")!;
const $container = document.querySelector("main")!;

const $metabox = document.getElementById("canvas-meta")! as HTMLDivElement;
const $metabox_pixels = $metabox.querySelector(
  ".canvas-meta--pixels"
) as HTMLSpanElement;
const $metabox_online = $metabox.querySelector(
  ".canvas-meta--online"
) as HTMLSpanElement;

const $testbtn = document.getElementById("test")! as HTMLButtonElement;

export type CanvasConfig = {
  size: [number, number];
  zoom: number;
};

const ZOOM_SPEED = 0.1;

class Canvas {
  private config: CanvasConfig = { size: [0, 0], zoom: 1 };

  /**
   * Last pixel place date
   *
   * TODO: Support pixel stacking
   */
  private lastPlace: Date | undefined;
  private zoom = 1;
  private move = { x: 0, y: 0 };
  private cursor = { x: -1, y: -1 };
  private ctx: CanvasRenderingContext2D | null = null;
  // private pixels: {
  //   x: number;
  //   y: number;
  //   color: number;
  //   type: "full" | "pending";
  // }[] = [];
  private pixels: {
    [x_y: string]: { color: number; type: "full" | "pending" };
  } = {};

  private mouseDown = false;
  private dragOrigin = { x: 0, y: 0 };
  private downTime: number | undefined;

  load(config: CanvasConfig) {
    this.config = config;
    $canvas.setAttribute("width", config.size[0] + "");
    $canvas.setAttribute("height", config.size[1] + "");
    this.setZoom(config.zoom);
  }

  setZoom(newzoom: number, mouse?: { x: number; y: number }) {
    if (newzoom < 0.5) newzoom = 0.5;
    const oldzoom = this.zoom;
    this.zoom = newzoom;

    $zoom.style.transform = `scale(${newzoom})`;

    if (mouse) {
      const dx = mouse.x - $container.clientWidth / 2;
      const dy = mouse.y - $container.clientHeight / 2;
      this.move.x -= dx / oldzoom;
      this.move.x += dx / newzoom;
      this.move.y -= dy / oldzoom;
      this.move.y += dy / newzoom;
      $move.style.transform = `translate(${this.move.x}px, ${this.move.y}px)`;
    }
  }

  setup() {
    this.ctx = $canvas.getContext("2d");

    let pinching = false;
    let pinchInit = 0;

    $testbtn.addEventListener("click", (e) => {
      e.preventDefault();

      $canvas.classList.toggle("pixelate");
    });

    window.addEventListener("wheel", (e) => {
      const oldzoom = this.zoom;
      let newzoom = (this.zoom += ZOOM_SPEED * (e.deltaY > 0 ? -1 : 1));
      this.setZoom(newzoom, {
        x: e.clientX,
        y: e.clientY,
      });
    });

    const handleMouseStart = (e: { pageX: number; pageY: number }) => {
      this.mouseDown = true;
      this.dragOrigin = { x: e.pageX, y: e.pageY };
      this.downTime = Date.now();
    };

    $moveContainer.addEventListener(
      "touchstart",
      (e) => {
        if (e.changedTouches.length === 2) {
          pinching = true;
          pinchInit = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
        } else {
          handleMouseStart(e.touches[0]);
        }

        $testbtn.innerText = e.changedTouches.length + "";
      },
      { passive: false }
    );
    $moveContainer.addEventListener("mousedown", handleMouseStart);

    const update = (x: number, y: number, update: boolean) => {
      const deltaX = (x - this.dragOrigin.x) / this.zoom;
      const deltaY = (y - this.dragOrigin.y) / this.zoom;
      const newX = this.move.x + deltaX;
      const newY = this.move.y + deltaY;
      if (update) {
        this.move.x += deltaX;
        this.move.y += deltaY;
      }
      $move.style.transform = `translate(${newX}px, ${newY}px)`;
    };

    const handleMouseEnd = (e: {
      clientX: number;
      clientY: number;
      pageX: number;
      pageY: number;
    }) => {
      if (!this.mouseDown) return;

      this.mouseDown = false;

      const downDelta = Date.now() - this.downTime!;
      const delta = [
        Math.abs(this.dragOrigin.x - e.clientX),
        Math.abs(this.dragOrigin.y - e.clientY),
      ];
      if (downDelta < 500) {
        // mouse was down for less than 500ms

        if (delta[0] < 5 && delta[1] < 5) {
          const [x, y] = this.screenToPos(e.clientX, e.clientY);
          this.place(x, y);
        }
      }

      update(e.pageX, e.pageY, true);
    };

    window.addEventListener("touchend", (e) => {
      if (pinching) {
        console.log("pinching end");
        pinching = false;
      } else {
        handleMouseEnd(e.changedTouches[0]);
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (pinching) {
        pinching = false;
      } else {
        handleMouseEnd(e);
      }
    });

    const handleMouseMove = (e: {
      pageX: number;
      pageY: number;
      clientX: number;
      clientY: number;
    }) => {
      if (this.mouseDown) {
        update(e.pageX, e.pageY, false);
      } else {
        const canvasRect = $canvas.getBoundingClientRect();
        if (
          canvasRect.left <= e.pageX &&
          canvasRect.right >= e.pageX &&
          canvasRect.top <= e.pageY &&
          canvasRect.bottom >= e.pageY
        ) {
          const [x, y] = this.screenToPos(e.clientX, e.clientY);
          this.cursor.x = x;
          this.cursor.y = y;
        } else {
          this.cursor.x = -1;
          this.cursor.y = -1;
        }
      }
    };

    window.addEventListener(
      "touchmove",
      (e) => {
        if (pinching) {
          let initDiff = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
          );
          let diff = (pinchInit - initDiff) / (10 / this.zoom);

          let newzoom = (this.zoom += ZOOM_SPEED * -diff);
          this.setZoom(newzoom, {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });

          pinchInit = initDiff;
        } else {
          handleMouseMove(e.touches[0]);
        }
      },
      { passive: false }
    );
    window.addEventListener("mousemove", handleMouseMove);

    $canvas.addEventListener("touchmove", (e) => {
      if (!pinching) {
        const [x, y] = this.screenToPos(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
        this.cursor.x = x;
        this.cursor.y = y;
      }
    });
    $canvas.addEventListener("mousemove", (e) => {
      const [x, y] = this.screenToPos(e.clientX, e.clientY);
      this.cursor.x = x;
      this.cursor.y = y;

      // window.requestAnimationFrame(() => this.draw());
    });
  }

  screenToPos(x: number, y: number) {
    const rect = $canvas.getBoundingClientRect();
    const scale = [$canvas.width / rect.width, $canvas.height / rect.height];
    return [x - rect.left, y - rect.top]
      .map((v, i) => v * scale[i])
      .map((v) => v >> 0);
  }

  draw() {
    if (!this.ctx) {
      window.requestAnimationFrame(() => this.draw());
      return;
    }

    /* @ts-ignore */
    this.ctx.mozImageSmoothingEnabled =
      /* @ts-ignore */
      this.ctx.webkitImageSmoothingEnabled =
      /* @ts-ignore */
      this.ctx.msImageSmoothingEnabled =
      this.ctx.imageSmoothingEnabled =
        false;

    this.ctx.canvas.width = window.innerWidth;
    this.ctx.canvas.height = window.innerHeight;

    const bezier = (n: number) => n * n * (3 - 2 * n);

    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.config.size[0], this.config.size[1]);

    for (const [x_y, pixel] of Object.entries(this.pixels)) {
      const [x, y] = x_y.split("_").map((a) => parseInt(a));

      this.ctx.globalAlpha = pixel.type === "full" ? 1 : 0.5;
      this.ctx.fillStyle =
        pixel.color > -1
          ? "#" + pallete.getPalleteColor(pixel.color)!.hex
          : "transparent";
      this.ctx.fillRect(x, y, 1, 1);
    }

    if (pallete.getColor() && this.cursor.x > -1 && this.cursor.y > -1) {
      let t = ((Date.now() / 100) % 10) / 10;
      this.ctx.globalAlpha = t < 0.5 ? bezier(t) : -bezier(t) + 1;
      this.ctx.fillStyle = "#" + pallete.getColor()!.hex;
      this.ctx.fillRect(this.cursor.x, this.cursor.y, 1, 1);
    }

    this.renderMetabox();

    window.requestAnimationFrame(() => this.draw());
  }

  /**
   * update canvas metabox with latest information
   *
   * executed by #draw()
   */
  renderMetabox() {
    if (this.lastPlace) {
      let cooldown =
        this.lastPlace.getTime() +
        pallete.getPixelCooldown() -
        new Date().getTime();
      $metabox_pixels.innerText = cooldown > 0 ? cooldown / 1000 + "s" : "none";
    } else {
      $metabox_pixels.innerText = "no cooldown";
    }

    $metabox_online.innerText = Network.getOnline() + "";
  }

  place(x: number, y: number) {
    if (!pallete.getColor()) return;

    if (this.lastPlace) {
      if (
        this.lastPlace.getTime() + pallete.getPixelCooldown() >
        new Date().getTime()
      ) {
        console.log("cannot place, cooldown in place");
        return;
      }
    }

    this.lastPlace = new Date();

    const color = pallete.getColor()!;

    // this.pixels.push({
    //   x,
    //   y,
    //   color: color.id,
    //   type: "pending",
    // });
    this.pixels[x + "_" + y] = {
      color: color.id,
      type: "pending",
    };

    Network.sendAck<CPixelPacket, SPixelPacket>("place", {
      x,
      y,
      color: color.id,
    }).then((ack) => {
      // remove pending pixel at coord
      // can remove regardless of success or failure, as success places pixel at coord from server
      // this.pixels.splice(
      //   this.pixels.indexOf(
      //     this.pixels.find(
      //       (pxl) =>
      //         pxl.x === x &&
      //         pxl.y === y &&
      //         pxl.color === color.id &&
      //         pxl.type === "pending"
      //     )!
      //   ),
      //   1
      // );

      if (ack.success) {
        this.handlePixel(ack.data);
      } else {
        // TODO: handle undo pixel
        alert("Error: " + ack.error);
      }
    });
  }

  handlePixel({ x, y, color, ...rest }: SPixelPacket) {
    // this.pixels.push({
    //   x,
    //   y,
    //   color,
    //   type: "full",
    // });
    this.pixels[x + "_" + y] = {
      color,
      type: "full",
    };
  }

  handleBatch(batch: SCanvasPacket) {
    batch.pixels.forEach((hex, index) => {
      const x = index / this.config.size[0];
      const y = index % this.config.size[0];
      const color = pallete.getPalleteFromHex(hex);

      this.pixels[x + "_" + y] = {
        color: color ? color.id : -1,
        type: "full",
      };
    });
  }
}

export default new Canvas();
