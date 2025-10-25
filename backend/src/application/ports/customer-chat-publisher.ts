export type CustomerChatRole = "customer" | "agent";

export type CustomerChatMessage = {
  customerId: string;
  author: CustomerChatRole;
  message: string;
  timestamp: Date;
};

export interface CustomerChatPublisher {
  publish(message: CustomerChatMessage): void;
}
