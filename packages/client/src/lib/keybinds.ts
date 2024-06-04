import EventEmitter from "eventemitter3";
import { EnforceObjectType } from "./utils";

interface IKeybind {
  key: KeyboardEvent["code"] | "LCLICK" | "RCLICK" | "MCLICK";

  alt?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

interface EmittedKeybind {
  clientX: number;
  clientY: number;
}

export const enforceObjectType: EnforceObjectType<IKeybind> = (v) => v;

const KEYBINDS = enforceObjectType({
  PIXEL_WHOIS: {
    key: "LCLICK",
    shift: true,
  },
});

class KeybindManager_ extends EventEmitter<{
  [k in keyof typeof KEYBINDS]: (args: EmittedKeybind) => void;
}> {
  constructor() {
    super();
    // setup listeners

    document.addEventListener("keyup", this.handleKeyup);
    document.addEventListener("click", this.handleClick);
  }

  destroy() {
    // remove listeners
    // this is global and doesn't depend on any elements, so this shouldn't need to be called
  }

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

    for (const [name_, keybind] of Object.entries(KEYBINDS)) {
      const name: keyof typeof KEYBINDS = name_ as any;

      if (keybind.key !== key.key) continue;
      if (typeof keybind.alt !== "undefined" && keybind.alt !== key.alt)
        continue;
      if (typeof keybind.ctrl !== "undefined" && keybind.ctrl !== key.ctrl)
        continue;
      if (typeof keybind.meta !== "undefined" && keybind.meta !== key.meta)
        continue;
      if (typeof keybind.shift !== "undefined" && keybind.shift !== key.shift)
        continue;

      this.emit(name, emit);
      isHandled = true;
    }

    return isHandled;
  }

  getKeybind(key: keyof typeof KEYBINDS) {
    return KEYBINDS[key];
  }
}

export const KeybindManager = new KeybindManager_();