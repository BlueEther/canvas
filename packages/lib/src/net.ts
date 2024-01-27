export type CPixelPacket = ClientPacket & {
  type: "place";
  x: number;
  y: number;
  color: number;
};

export type SCanvasPacket = ServerPacket & {
  type: "canvas";
  pixels: string[];
};

export type SPixelPacket = ServerPacket & {
  type: "pixel";
  x: number;
  y: number;
  color: number;
};

export type SUserPacket = ServerPacket & {
  type: "user";
  user: AuthSession;
};

export type Packet = {
  type: string;
};

// server -> client
export type ServerPacket = Packet & {
  _direction: "server->client";
};

// client -> server
export type ClientPacket = Packet & {
  _direction: "client->server";
};

export type PacketAck<T = ServerPacket> =
  | {
      success: true;
      data: T;
    }
  | { success: false; error: string };

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
