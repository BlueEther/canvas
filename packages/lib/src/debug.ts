import EventEmitter from "eventemitter3";

interface DebugEvents {
  openTools(): void;
}

interface DebugArgs {
  point: [x: number, y: number, id?: string];
  text: [str: any];
}

export enum FlagCategory {
  "Renderer",
  "DebugMessages",
  "Uncategorized",
}

class ExperimentFlag {
  id: string;
  enabled: boolean;
  category: FlagCategory = FlagCategory.Uncategorized;

  constructor(id: string, defaultEnabled = false, category?: FlagCategory) {
    this.id = id;
    this.enabled = defaultEnabled;
    if (category) this.category = category;
  }
}

interface FlagEvents {
  enable(flag_id: string): void;
  disable(flag_id: string): void;
}

class FlagManager extends EventEmitter<FlagEvents> {
  flags: ExperimentFlag[];

  constructor() {
    super();
    this.flags = [];

    this.register(
      // RENDERER
      new ExperimentFlag(
        "PANZOOM_PINCH_TRANSFORM_1",
        false,
        FlagCategory.Renderer
      ),
      new ExperimentFlag(
        "PANZOOM_PINCH_TRANSFORM_2",
        false,
        FlagCategory.Renderer
      ),

      // DEBUG MESSAGES
      new ExperimentFlag(
        "PANZOOM_PINCH_DEBUG_MESSAGES",
        false,
        FlagCategory.DebugMessages
      )
    );
  }

  register(...flags: ExperimentFlag[]) {
    this.flags.push(...flags);
  }

  getFlag(flag: string) {
    return this.flags.find((f) => f.id === flag);
  }

  enabled(flag: string) {
    return this.getFlag(flag)?.enabled;
  }

  setEnabled(flagID: string, enabled: boolean) {
    const flag = this.flags.find((f) => f.id === flagID);
    if (!flag) throw new Error("Unknown flag " + flagID);

    flag.enabled = enabled;

    if (enabled) {
      this.emit("enable", flagID);
    } else {
      this.emit("disable", flagID);
    }
  }

  getAll() {
    return [...this.flags].sort((a, b) => a.category - b.category);
  }
}

/**
 * Debug wrapper
 *
 * Goals:
 * - toggle debug flags (similar to Discord experiments)
 * - open blank debug tab with useragent and any flags
 */
class Debugcl extends EventEmitter<DebugEvents> {
  readonly flags = new FlagManager();
  _getRenderer: any;

  constructor() {
    super();
  }

  openDebug() {
    const wind = window.open("about:blank", "_blank");
    if (!wind) {
      alert(
        "Failed to open debug tab. Is your anti-popup too powerful? Or did this get triggered from not a trusted event"
      );
      return;
    }

    wind.document.write(`
    <h1>debug menu</h1>
    <pre>${JSON.stringify(
      {
        userAgent: navigator.userAgent,
        flags: this.flags
          .getAll()
          .filter((f) => f.enabled)
          .map((f) => f.id),
      },
      null,
      2
    )}</pre>
    `);
    wind.document.close();
  }

  openDebugTools() {
    this.emit("openTools");
  }

  /**
   * Create debug marker
   *
   * Useful on touchscreen devices
   *
   * @param type
   * @param args
   * @returns
   */
  debug<T extends keyof DebugArgs>(type: T, ...args: DebugArgs[T]) {
    switch (type) {
      case "point": {
        const [x, y, id] = args;

        if (document.getElementById("debug-" + id)) {
          document.getElementById("debug-" + id)!.style.top = y + "px";
          document.getElementById("debug-" + id)!.style.left = x + "px";
          return;
        }
        let el = document.createElement("div");
        if (id) el.id = "debug-" + id;
        el.classList.add("debug-point");
        el.style.setProperty("top", y + "px");
        el.style.setProperty("left", x + "px");
        document.body.appendChild(el);
        break;
      }
      case "text": {
        const [str] = args;

        // create debug box in canvas-meta if it doesn't exist
        if (!document.getElementById("canvas-meta-debug")) {
          let debugBox = document.createElement("div");
          debugBox.id = "canvas-meta-debug";
          debugBox.style.whiteSpace = "pre";
          debugBox.style.unicodeBidi = "embed";
          document.getElementById("canvas-meta")!.prepend(debugBox);
        }

        document.getElementById("canvas-meta-debug")!.innerText =
          typeof str === "string" ? str : JSON.stringify(str, null, 2);
        break;
      }
    }
  }

  getRenderer() {
    return this._getRenderer();
  }
}

const Debug = new Debugcl();

// @ts-ignore
window.Debug = Debug;

export { Debug };
