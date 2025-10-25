export interface RealtimeGateway {
  emit<T>(event: string, payload: T): void;
  close(): Promise<void>;
}
