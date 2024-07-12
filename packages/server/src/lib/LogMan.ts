import { PixelLogger } from "./Logger";

interface UserEvents {
  pixel_place: { x: number; y: number; hex: string };
  pixel_undo: { x: number; y: number; hex?: string };
  mod_fill: {
    from: [x: number, y: number];
    to: [x: number, y: number];
    hex: string;
  };
  mod_override: { x: number; y: number; hex: string };
  mod_rollback: { x: number; y: number; hex?: string };
  mod_rollback_undo: { x: number; y: number; hex?: string };
}

interface SystemEvents {
  canvas_size: { width: number; height: number };
  canvas_freeze: {};
  canvas_unfreeze: {};
}

/**
 * Handle logs that should be written to a text file
 *
 * This could be used as an EventEmitter in the future, but as of right now
 * it just adds typing to logging of these events
 *
 * TODO: better name, this one is not it
 *
 * @see #57
 */
class LogMan_ {
  log<EventName extends keyof SystemEvents>(
    event: EventName,
    data: SystemEvents[EventName]
  ): void;
  log<EventName extends keyof UserEvents>(
    event: EventName,
    user: string,
    data: UserEvents[EventName]
  ): void;
  log<EventName extends keyof UserEvents | keyof SystemEvents>(
    event: EventName,
    ...params: EventName extends keyof UserEvents
      ? [user: string, data: UserEvents[EventName]]
      : EventName extends keyof SystemEvents
        ? [data: SystemEvents[EventName]]
        : never
  ): void {
    let parts: string[] = [];

    if (params.length === 2) {
      // user event
      let user = params[0] as string;
      parts.push(user, event);

      if (event === "mod_fill") {
        // this event format has a different line format
        let data: UserEvents["mod_fill"] = params[1] as any;

        parts.push(data.from.join(","), data.to.join(","), data.hex);
      } else {
        let data: UserEvents[Exclude<keyof UserEvents, "mod_fill">] =
          params[1] as any;
        parts.push(...[data.x, data.y, data.hex || "unset"].map((a) => a + ""));
      }
    } else {
      // system event

      parts.push("system", event);

      switch (event) {
        case "canvas_size":
          let data: SystemEvents["canvas_size"] = params[0] as any;
          let { width, height } = data;
          parts.push(width + "", height + "");
          break;
      }
    }

    PixelLogger.info(parts.join("\t"));
  }
}

export const LogMan = new LogMan_();
