import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import type { BaseLogger } from "../../adapters/logger/base-logger";
import type { RealtimeGateway } from "./realtime-gateway";

export type SocketIoGatewayOptions = {
  logger?: BaseLogger;
};

export type SocketConnectionHandler = (socket: Socket) => void;

export class SocketIoGateway implements RealtimeGateway {
  private readonly io: SocketIOServer;
  private readonly logger?: BaseLogger;
  private readonly connectionHandlers: SocketConnectionHandler[] = [];

  constructor(server: HttpServer, options: SocketIoGatewayOptions = {}) {
    this.logger = options.logger;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*"
      }
    });

    this.io.on("connection", (socket) => {
      this.logger?.debug("Socket connected", { socketId: socket.id });

      for (const handler of this.connectionHandlers) {
        handler(socket);
      }

      socket.on("disconnect", (reason) => {
        this.logger?.debug("Socket disconnected", { socketId: socket.id, reason });
      });
    });
  }

  onConnection(handler: SocketConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  emit<T>(event: string, payload: T): void {
    this.io.emit(event, payload);
  }

  toRoom<T>(room: string, event: string, payload: T): void {
    this.io.to(room).emit(event, payload);
  }

  async close(): Promise<void> {
    await this.io.close();
  }
}
