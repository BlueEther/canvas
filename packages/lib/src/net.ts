// socket.io

export interface ServerToClientEvents {
  canvas: (pixels: string[]) => void;
  user: (user: AuthSession) => void;
  config: (config: ClientConfig) => void;
  pixel: (pixel: Pixel) => void;
  online: (count: { count: number }) => void;
  availablePixels: (count: number) => void;
  pixelLastPlaced: (time: number) => void;
  undo: (
    data: { available: false } | { available: true; expireAt: number }
  ) => void;
}

export interface ClientToServerEvents {
  place: (
    pixel: Pixel,
    ack: (
      _: PacketAck<
        Pixel,
        "no_user" | "invalid_pixel" | "pixel_cooldown" | "palette_color_invalid"
      >
    ) => void
  ) => void;
  undo: (ack: (_: PacketAck<{}, "no_user" | "unavailable">) => void) => void;
}

// app context

// TODO: move to client/{...}/AppContext.tsx
export interface IAppContext {
  config: ClientConfig;
  user?: AuthSession;
  canvasPosition?: ICanvasPosition;
  setCanvasPosition: (v: ICanvasPosition) => void;
  cursorPosition?: IPosition;
  setCursorPosition: (v?: IPosition) => void;
  pixels: { available: number };
  settingsSidebar: boolean;
  setSettingsSidebar: (v: boolean) => void;
  undo?: { available: true; expireAt: number };
  loadChat: boolean;
  setLoadChat: (v: boolean) => void;
  connected: boolean;

  hasAdmin: boolean;
}

export interface IPalleteContext {
  color?: number;
}

export interface ICanvasPosition {
  x: number;
  y: number;
  zoom: number;
}

export interface IPosition {
  x: number;
  y: number;
}

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
