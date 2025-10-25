import type {
  CustomerChatMessage,
  CustomerChatPublisher
} from "../../application/ports/customer-chat-publisher";
import type { RealtimeGateway } from "../../frameworks/realtime/realtime-gateway";

export class SocketIoCustomerChatPublisher implements CustomerChatPublisher {
  constructor(private readonly gateway: RealtimeGateway) {}

  publish(message: CustomerChatMessage): void {
    const payload = {
      customerId: message.customerId,
      author: message.author,
      message: message.message,
      timestamp: message.timestamp.toISOString()
    };

    this.gateway.toRoom(buildRoomName(message.customerId), "customers:chat:message", payload);
  }
}

export function buildRoomName(customerId: string): string {
  return `customer:${customerId}:chat`;
}
