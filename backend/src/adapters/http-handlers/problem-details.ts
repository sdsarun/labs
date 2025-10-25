import type { HttpReply } from "./base-http-handler";

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export type ProblemOptions = {
  type?: string;
  detail?: string;
  instance?: string;
};

export function createProblem(
  status: number,
  title: string,
  options: ProblemOptions = {},
): ProblemDetails {
  return {
    type: options.type ?? `https://httpstatuses.com/${status}`,
    title,
    status,
    detail: options.detail,
    instance: options.instance,
  };
}

export function sendProblem(
  reply: HttpReply,
  status: number,
  title: string,
  options: ProblemOptions = {},
): void {
  reply.status(status).json(createProblem(status, title, options));
}
