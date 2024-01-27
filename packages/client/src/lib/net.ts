import io from "socket.io-client";
import Pallete from "./pallete";
import Canvas from "./canvas";
import {
  CPixelPacket,
  ClientPacket,
  PacketAck,
  SCanvasPacket,
  SPixelPacket,
  SUserPacket,
  ServerPacket,
} from "@sc07-canvas/lib/src/net";
import Auth from "./auth";

class Network {
  private socket;
  private online_count = 0;

  constructor() {
    this.socket = io();

    this.socket.on("config", (config) => {
      Pallete.load(config.pallete);
      Canvas.load(config.canvas);
    });

    this.socket.on("pixel", (data: SPixelPacket) => {
      Canvas.handlePixel(data);
    });

    this.socket.on("user", (data: SUserPacket) => {
      Auth.handleAuth(data);
    });

    this.socket.on("canvas", (data: SCanvasPacket) => {
      Canvas.handleBatch(data);
    });

    this.socket.on("online", (data: { count: number }) => {
      this.online_count = data.count;
    });
  }

  send<T extends ClientPacket>(
    type: T["type"],
    data: Omit<T, "type" | "_direction">
  ) {
    // @ts-ignore
    data._direction = "client->server";

    this.socket.emit(type, data);
  }

  sendAck<O extends ClientPacket, I extends ServerPacket>(
    type: O["type"],
    data: Omit<O, "type" | "_direction">
  ) {
    return new Promise<PacketAck<I>>((res) => {
      this.socket.emit(type, data, (data: PacketAck<I>) => {
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

export default new Network();
