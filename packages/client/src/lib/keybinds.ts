import EventEmitter from "eventemitter3";
import { EnforceObjectType } from "./utils";

interface IKeybind {
  key: KeyboardEvent["code"] | "LCLICK" | "RCLICK" | "MCLICK" | "LONG_PRESS";

  alt?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

interface EmittedKeybind {
  clientX: number;
  clientY: number;
}

export const enforceObjectType: EnforceObjectType<IKeybind[]> = (v) => v;

const KEYBINDS = enforceObjectType({
  PIXEL_WHOIS: [
    {
      key: "LCLICK",
      shift: true,
    },
    { key: "LONG_PRESS" },
  ],
  TEMPLATE_MOVE: [
    {
      key: "LCLICK",
      alt: true,
    },
  ],
  TOGGLE_TEMPLATE: [
    {
      key: "KeyT",
    },
  ],
  TOGGLE_BLANK: [
    {
      key: "KeyV", // legacy pxls keybind
    },
    {
      key: "KeyB",
    },
  ],
  TOGGLE_HEATMAP: [
    {
      key: "KeyH",
    },
  ],
  TOGGLE_MOD_MENU: [
    {
      key: "KeyM",
    },
  ],
  DESELECT_COLOR: [
    {
      key: "Escape",
    },
  ],
});

class KeybindManager_ extends EventEmitter<{
  [k in keyof typeof KEYBINDS]: (args: EmittedKeybind) => void;
}> {
  constructor() {
    super();
    // setup listeners

    document.addEventListener("keydown", this.handleKeydown, {
      passive: false,
    });
    document.addEventListener("keyup", this.handleKeyup);
    document.addEventListener("click", this.handleClick);
  }

  destroy() {
    // remove listeners
    // this is global and doesn't depend on any elements, so this shouldn't need to be called
  }

  handleKeydown = (e: KeyboardEvent) => {
    const blacklistedElements = ["INPUT"];

    if (e.target instanceof HTMLElement) {
      if (blacklistedElements.indexOf(e.target.tagName) > -1) {
        return;
      }
    }

    if (e.key === "Alt") e.preventDefault();
    if (e.key === "Control") e.preventDefault();
    if (e.key === "Shift") e.preventDefault();
  };

  handleKeyup = (e: KeyboardEvent) => {
    // discard if in an input element

    const blacklistedElements = ["INPUT"];

    if (e.target instanceof HTMLElement) {
      if (blacklistedElements.indexOf(e.target.tagName) > -1) {
        return;
      }
    }

    let isHandled = this.handleInteraction(
      {
        key: e.code,
        alt: e.altKey,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
      },
      {
        clientX: -1,
        clientY: -1,
      }
    );

    if (isHandled) e.preventDefault();
  };

  handleClick = (e: MouseEvent) => {
    let button: "LCLICK" | "RCLICK" | "MCLICK" = ["LCLICK", "MCLICK", "RCLICK"][
      e.button
    ] as any;

    let isHandled = this.handleInteraction(
      {
        key: button,
        alt: e.altKey,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
      },
      {
        clientX: e.clientX,
        clientY: e.clientY,
      }
    );

    if (isHandled) e.preventDefault();
  };

  /**
   * Handle interaction
   * @param key
   * @returns if handled
   */
  handleInteraction(key: IKeybind, emit: EmittedKeybind): boolean {
    let isHandled = false;

    for (const [name_, keybinds] of Object.entries(KEYBINDS)) {
      const name: keyof typeof KEYBINDS = name_ as any;

      const valid = keybinds.find((kb) => {
        if (kb.key !== key.key) return false;
        if (typeof kb.alt !== "undefined" && kb.alt !== key.alt) return false;
        if (typeof kb.ctrl !== "undefined" && kb.ctrl !== key.ctrl)
          return false;
        if (typeof kb.meta !== "undefined" && kb.meta !== key.meta)
          return false;
        if (typeof kb.shift !== "undefined" && kb.shift !== key.shift)
          return false;

        return true;
      });

      if (!valid) continue;

      this.emit(name, emit);
      isHandled = true;
    }

    return isHandled;
  }

  getKeybind(key: keyof typeof KEYBINDS) {
    return KEYBINDS[key];
  }

  getKeybinds() {
    return { ...KEYBINDS };
  }
}

export const KeybindManager = new KeybindManager_();
