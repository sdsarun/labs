import type { Socket } from "socket.io";

export interface RealtimeGateway {
  emit<T>(event: string, payload: T): void;
  toRoom<T>(room: string, event: string, payload: T): void;
  onConnection(handler: (socket: Socket) => void): void;
  close(): Promise<void>;
}
