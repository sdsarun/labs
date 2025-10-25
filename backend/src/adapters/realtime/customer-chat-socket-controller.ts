import type { Socket } from "socket.io";
import type { SendCustomerChatMessageUseCase } from "../../application/usecases/send-customer-chat-message";
import type { BaseLogger } from "../logger/base-logger";
import { ValidationError } from "../../application/errors";
import type { RealtimeGateway } from "../../frameworks/realtime/realtime-gateway";
import { buildRoomName } from "./socket-io-customer-chat-publisher";

type JoinPayload = {
  customerId?: unknown;
  role?: unknown;
};

type LeavePayload = {
  customerId?: unknown;
};

type MessagePayload = {
  customerId?: unknown;
  author?: unknown;
  message?: unknown;
};

export class CustomerChatSocketController {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly sendMessage: SendCustomerChatMessageUseCase,
    private readonly logger?: BaseLogger
  ) {
    this.gateway.onConnection((socket) => this.registerHandlers(socket));
  }

  private registerHandlers(socket: Socket): void {
    socket.data.chatRooms = new Set<string>();

    socket.on("customers:chat:join", (payload: JoinPayload) => {
      try {
        const { customerId, role } = this.parseJoinPayload(payload);
        const room = buildRoomName(customerId);
        socket.join(room);
        socket.data.chatRooms?.add(room);
        this.logger?.debug("Socket joined customer chat", {
          socketId: socket.id,
          customerId,
          role
        });
        socket.emit("customers:chat:joined", { customerId, role });
      } catch (error) {
        this.emitError(socket, error);
      }
    });

    socket.on("customers:chat:leave", (payload: LeavePayload) => {
      try {
        const { customerId } = this.parseLeavePayload(payload);
        const room = buildRoomName(customerId);
        socket.leave(room);
        socket.data.chatRooms?.delete(room);
        this.logger?.debug("Socket left customer chat", { socketId: socket.id, customerId });
        socket.emit("customers:chat:left", { customerId });
      } catch (error) {
        this.emitError(socket, error);
      }
    });

    socket.on("customers:chat:message", async (payload: MessagePayload) => {
      try {
        const message = await this.sendMessage.execute({
          customerId: this.mustBeString(payload?.customerId, "customerId"),
          author: this.optionalString(payload?.author),
          message: this.mustBeString(payload?.message, "message")
        });

        const room = buildRoomName(message.customerId);
        if (!socket.rooms.has(room)) {
          socket.join(room);
          socket.data.chatRooms?.add(room);
        }

        this.logger?.debug("Broadcasting customer chat message", {
          socketId: socket.id,
          customerId: message.customerId,
          author: message.author
        });

        this.gateway.toRoom(room, "customers:chat:message", {
          customerId: message.customerId,
          author: message.author,
          message: message.message,
          timestamp: message.timestamp.toISOString()
        });
      } catch (error) {
        this.emitError(socket, error);
      }
    });
  }

  private parseJoinPayload(payload: JoinPayload): { customerId: string; role: "customer" | "agent" } {
    const customerId = this.mustBeString(payload?.customerId, "customerId");
    const roleValue = this.optionalString(payload?.role);
    return {
      customerId,
      role: roleValue === "agent" ? "agent" : "customer"
    };
  }

  private parseLeavePayload(payload: LeavePayload): { customerId: string } {
    const customerId = this.mustBeString(payload?.customerId, "customerId");
    return { customerId };
  }

  private mustBeString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ValidationError(`${field} is required.`);
    }

    return value.trim();
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private emitError(socket: Socket, error: unknown): void {
    const message =
      error instanceof ValidationError
        ? error.message
        : error instanceof Error
        ? error.message
        : "Unexpected error";

    socket.emit("customers:chat:error", { message });
    this.logger?.warn("Customer chat error", { socketId: socket.id, error: message });
  }
}
