export interface UseCase<Input = unknown, Output = unknown> {
  execute(input: Input): Promise<Output>;
}
