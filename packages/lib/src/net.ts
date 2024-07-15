// socket.io

export type Subscription = "heatmap";

export interface ServerToClientEvents {
  canvas: (
    start: [x: number, y: number],
    end: [x: number, y: number],
    pixels: string[]
  ) => void;
  clearCanvasChunks: () => void;
  user: (user: AuthSession) => void;
  standing: (standing: IAccountStanding) => void;
  config: (config: ClientConfig) => void;
  pixel: (pixel: Pixel) => void;
  online: (count: { count: number }) => void;
  availablePixels: (count: number) => void;
  pixelLastPlaced: (time: number) => void;
  undo: (
    data: { available: false } | { available: true; expireAt: number }
  ) => void;
  square: (
    start: [x: number, y: number],
    end: [x: number, y: number],
    color: number
  ) => void;

  alert: (alert: IAlert) => void;
  alert_dismiss: (id: string) => void;

  recaptcha: (site_key: string) => void;
  recaptcha_challenge: (ack: (token: string) => void) => void;

  /* --- subscribe events --- */

  /**
   * Emitted to room `sub:heatmap`
   * @param heatmap
   * @returns
   */
  heatmap: (heatmap: string) => void;
}

export interface ClientToServerEvents {
  place: (
    pixel: Pixel,
    bypassCooldown: boolean,
    ack: (
      _: PacketAck<
        Pixel,
        | "canvas_frozen"
        | "no_user"
        | "invalid_pixel"
        | "pixel_cooldown"
        | "palette_color_invalid"
        | "you_already_placed_that"
        | "banned"
        | "pixel_already_pending"
      >
    ) => void
  ) => void;
  undo: (
    ack: (
      _: PacketAck<
        {},
        "canvas_frozen" | "no_user" | "unavailable" | "pixel_covered"
      >
    ) => void
  ) => void;

  subscribe: (topic: Subscription) => void;
  unsubscribe: (topic: Subscription) => void;
}

export interface IPosition {
  x: number;
  y: number;
}

export type IAccountStanding =
  | {
      banned: false;
    }
  | {
      banned: true;
      /**
       * ISO timestamp
       */
      until: string;
      reason?: string;
    };

/**
 * Typescript magic
 *
 * key => name of the event
 * value => what metadata the message will include
 */
export interface IAlertKeyedMessages {
  banned: {
    /**
     * ISO date
     */
    until: string;
  };
  unbanned: {};
}

export type IAlert<Is extends "toast" | "modal" = "toast" | "modal"> = {
  is: Is;
  action: "system" | "moderation";
  id?: string;
} & (
  | {
      is: "toast";
      severity: "info" | "success" | "warning" | "error" | "default";
      autoDismiss: boolean;
    }
  | {
      is: "modal";
      dismissable: boolean;
    }
) &
  (IAlertKeyed | { title: string; body?: string });

/**
 * Typescript magic
 *
 * #metadata depends on message_key and is mapped via IAlertKeyedMessages
 */
type IAlertKeyed = keyof IAlertKeyedMessages extends infer MessageKey
  ? MessageKey extends keyof IAlertKeyedMessages
    ? {
        message_key: MessageKey;
        metadata: IAlertKeyedMessages[MessageKey];
      }
    : never
  : never;

// other

export type Pixel = {
  x: number;
  y: number;
  /**
   * Palette color ID or -1 for nothing
   */
  color: number;
};

export type PalleteColor = {
  id: number;
  name: string;
  hex: string;
};

export type CanvasConfig = {
  size: [number, number];
  frozen: boolean;
  zoom: number;
  pixel: {
    maxStack: number;
    cooldown: number;
    multiplier: number;
  };
  undo: {
    /**
     * time in ms to allow undos
     */
    grace_period: number;
  };
};

export type ClientConfig = {
  /**
   * Monolith git hash, if it doesn't match, client will reload
   */
  version: string;
  pallete: {
    colors: PalleteColor[];
    pixel_cooldown: number;
  };
  canvas: CanvasConfig;
  chat: {
    enabled: boolean;
    /**
     * @example aftermath.gg
     */
    matrix_homeserver: string;
    /**
     * @example https://chat.fediverse.events
     */
    element_host: string;
    /**
     * URI encoded alias
     * @example %23canvas-general:aftermath.gg
     */
    general_alias: string;
  };
};

/**
 * @template T the packet data
 * @template E union type of errors possible
 */
export type PacketAck<T, E = string> =
  | {
      success: true;
      data: T;
    }
  | { success: false; error: E };

export type AuthSession = {
  service: {
    software: {
      name: string;
      version: string;
      logo_uri?: string;
      repository?: string;
      homepage?: string;
    };
    instance: {
      hostname: string;
      logo_uri?: string;
      banner_uri?: string;
      name?: string;
    };
  };
  user: {
    username: string;
    picture_url?: string;
  };
};
