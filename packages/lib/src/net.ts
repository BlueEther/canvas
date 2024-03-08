// socket.io

export interface ServerToClientEvents {
  canvas: (pixels: string[]) => void;
  user: (user: AuthSession) => void;
  config: (config: ClientConfig) => void;
  pixel: (pixel: Pixel) => void;
  online: (count: { count: number }) => void;
  availablePixels: (count: number) => void;
  pixelLastPlaced: (time: number) => void;
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
}

// app context

export interface IAppContext {
  config: ClientConfig;
  user?: AuthSession;
  canvasPosition?: ICanvasPosition;
  setCanvasPosition: (v: ICanvasPosition) => void;
  cursorPosition?: IPosition;
  setCursorPosition: (v?: IPosition) => void;
  pixels: { available: number };
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
};

export type ClientConfig = {
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
    };
    instance: {
      hostname: string;
    };
  };
  user: {
    username: string;
    profile: string;
  };
};
