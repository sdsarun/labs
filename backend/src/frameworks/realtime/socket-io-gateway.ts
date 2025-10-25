import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import type { BaseLogger } from "../../adapters/logger/base-logger";
import type { RealtimeGateway } from "./realtime-gateway";

export type SocketIoGatewayOptions = {
  logger?: BaseLogger;
};

export class SocketIoGateway implements RealtimeGateway {
  private readonly io: SocketIOServer;
  private readonly logger?: BaseLogger;

  constructor(server: HttpServer, options: SocketIoGatewayOptions = {}) {
    this.logger = options.logger;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*"
      }
    });

    this.io.on("connection", (socket) => {
      this.logger?.debug("Socket connected", { socketId: socket.id });

      socket.on("disconnect", (reason) => {
        this.logger?.debug("Socket disconnected", { socketId: socket.id, reason });
      });
    });
  }

  emit<T>(event: string, payload: T): void {
    this.io.emit(event, payload);
  }

  async close(): Promise<void> {
    await this.io.close();
  }
}
