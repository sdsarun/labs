import type { HttpReply, HttpRequest } from "./base-http-handler";
import {
  entityTagEquals,
  generateWeakEtagFromBody,
  parseEntityTagHeader
} from "../../frameworks/http/etag-utils";
import { sendProblem } from "./problem-details";

type EnsureIfMatchParams = {
  request: HttpRequest;
  reply: HttpReply;
  currentRepresentation: unknown;
};

export function ensureIfMatch({ request, reply, currentRepresentation }: EnsureIfMatchParams): boolean {
  const candidates = parseEntityTagHeader(request.headers as Record<string, unknown>, "if-match");

  if (!candidates || candidates.length === 0) {
    sendProblem(reply, 428, "Precondition required", {
      detail: "If-Match header is required for this operation."
    });
    return false;
  }

  if (candidates.includes("*")) {
    return true;
  }

  const currentEtag = generateWeakEtagFromBody(currentRepresentation);
  if (!currentEtag) {
    return true;
  }

  if (!candidates.some((candidate) => entityTagEquals(candidate, currentEtag))) {
    sendProblem(reply, 412, "Precondition failed", {
      detail: "Resource has changed since it was last retrieved."
    });
    return false;
  }

  return true;
}

type EnsureIfNoneMatchParams = {
  request: HttpRequest;
  reply: HttpReply;
  currentRepresentation: unknown;
};

export function ensureIfNoneMatch({
  request,
  reply,
  currentRepresentation
}: EnsureIfNoneMatchParams): boolean {
  const etag = generateWeakEtagFromBody(currentRepresentation);
  if (!etag) {
    return true;
  }

  reply.header("etag", etag);

  const candidates = parseEntityTagHeader(request.headers as Record<string, unknown>, "if-none-match");
  if (!candidates || candidates.length === 0) {
    return true;
  }

  const matched =
    candidates.includes("*") || candidates.some((candidate) => entityTagEquals(candidate, etag));

  if (matched) {
    reply.status(304).send(undefined);
    return false;
  }

  return true;
}
