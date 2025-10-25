import { ValidationError } from "../errors";
import type {
  CustomerChatMessage,
  CustomerChatPublisher,
  CustomerChatRole
} from "../ports/customer-chat-publisher";
import type { UseCase } from "../types/usecase";

export type SendCustomerChatMessageInput = {
  customerId: string;
  author?: string;
  message: string;
};

export type SendCustomerChatMessageOutput = CustomerChatMessage;

export class SendCustomerChatMessageUseCase
  implements UseCase<SendCustomerChatMessageInput, SendCustomerChatMessageOutput>
{
  constructor(private readonly publisher: CustomerChatPublisher) {}

  async execute(input: SendCustomerChatMessageInput): Promise<SendCustomerChatMessageOutput> {
    const customerId = input.customerId?.trim();
    if (!customerId) {
      throw new ValidationError("customerId is required.");
    }

    const message = input.message?.trim();
    if (!message) {
      throw new ValidationError("message is required.");
    }

    const author = normalizeRole(input.author);
    const chatMessage: CustomerChatMessage = {
      customerId,
      author,
      message,
      timestamp: new Date()
    };

    this.publisher.publish(chatMessage);

    return chatMessage;
  }
}

function normalizeRole(role: unknown): CustomerChatRole {
  return role === "agent" ? "agent" : "customer";
}
