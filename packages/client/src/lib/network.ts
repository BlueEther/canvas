import { Socket, io } from "socket.io-client";
import EventEmitter from "eventemitter3";
import {
  AuthSession,
  ClientConfig,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@sc07-canvas/lib/src/net";

export interface INetworkEvents {
  user: (user: AuthSession) => void;
  config: (user: ClientConfig) => void;
  canvas: (pixels: string[]) => void;
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
    }
  );
  private online_count = 0;
  private sentEvents: {
    [key in keyof INetworkEvents]?: SentEventValue<key>;
  } = {};

  constructor() {
    super();

    this.socket.on("user", (user: AuthSession) => {
      this.emit("user", user);
    });

    this.socket.on("config", (config) => {
      this.emit("config", config);
    });

    this.socket.on("canvas", (pixels) => {
      this._emit("canvas", pixels);
    });

    // this.socket.on("config", (config) => {
    //   Pallete.load(config.pallete);
    //   Canvas.load(config.canvas);
    // });

    // this.socket.on("pixel", (data: SPixelPacket) => {
    //   Canvas.handlePixel(data);
    // });

    // this.socket.on("canvas", (data: SCanvasPacket) => {
    //   Canvas.handleBatch(data);
    // });

    // this.socket.on("online", (data: { count: number }) => {
    //   this.online_count = data.count;
    // });
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
