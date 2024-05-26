import { Socket, io } from "socket.io-client";
import EventEmitter from "eventemitter3";
import {
  AuthSession,
  ClientConfig,
  ClientToServerEvents,
  Pixel,
  ServerToClientEvents,
} from "@sc07-canvas/lib/src/net";
import { toast } from "react-toastify";

export interface INetworkEvents {
  connected: () => void;
  disconnected: () => void;

  user: (user: AuthSession) => void;
  config: (user: ClientConfig) => void;
  canvas: (pixels: string[]) => void;
  pixels: (data: { available: number }) => void;
  pixelLastPlaced: (time: number) => void;
  online: (count: number) => void;
  pixel: (pixel: Pixel) => void;
  undo: (
    data: { available: false } | { available: true; expireAt: number }
  ) => void;
}

type SentEventValue<K extends keyof INetworkEvents> = EventEmitter.ArgumentMap<
  Exclude<INetworkEvents, string | symbol>
>[Extract<K, keyof INetworkEvents>];

class Network extends EventEmitter<INetworkEvents> {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    import.meta.env.VITE_API_HOST,
    {
      autoConnect: false,
      withCredentials: true,
      transports: ["polling"],
    }
  );
  private online_count = 0;
  private sentEvents: {
    [key in keyof INetworkEvents]?: SentEventValue<key>;
  } = {};

  constructor() {
    super();

    this.socket.on("connect", () => {
      console.log("Connected to server");
      toast.success("Connected to server");
      this.emit("connected");
    });

    this.socket.on("connect_error", (err) => {
      // TODO: proper error handling
      console.error("Failed to connect to server", err);
      toast.error("Failed to connect: " + (err.message || err.name));
    });

    this.socket.on("disconnect", (reason, desc) => {
      console.log("Disconnected from server", reason, desc);
      toast.warn("Disconnected from server");
      this.emit("disconnected");
    });

    this.socket.on("user", (user: AuthSession) => {
      this.emit("user", user);
    });

    this.socket.on("config", (config) => {
      console.info("Server sent config", config);

      if (config.version !== __COMMIT_HASH__) {
        toast.info("Client version does not match server, reloading...");
        console.warn("Client version does not match server, reloading...", {
          clientVersion: __COMMIT_HASH__,
          serverVersion: config.version,
        });
        window.location.reload();
      }

      this.emit("config", config);
    });

    this.socket.on("canvas", (pixels) => {
      this._emit("canvas", pixels);
    });

    this.socket.on("availablePixels", (count) => {
      this._emit("pixels", { available: count });
    });

    this.socket.on("pixelLastPlaced", (time) => {
      this._emit("pixelLastPlaced", time);
    });

    this.socket.on("online", ({ count }) => {
      this._emit("online", count);
    });

    this.socket.on("pixel", (pixel) => {
      this.emit("pixel", pixel);
    });

    this.socket.on("undo", (undo) => {
      this.emit("undo", undo);
    });
  }

  private _emit: typeof this.emit = (event, ...args) => {
    this.sentEvents[event] = args;
    return this.emit(event, ...args);
  };

  waitFor<Ev extends keyof INetworkEvents & (string | symbol)>(
    ev: Ev
  ): Promise<SentEventValue<Ev>> {
    return new Promise((res) => {
      if (this.sentEvents[ev]) return res(this.sentEvents[ev]!);

      this.once(ev, (...data) => {
        res(data);
      });
    });
  }

  /**
   * Get online user count
   * @returns online users count
   */
  getOnline() {
    return this.online_count;
  }
}

export default new Network() as Network;
