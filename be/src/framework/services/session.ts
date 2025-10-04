import { randomBytes } from "crypto";
import type {
  CookieOptions,
  Request,
  Response,
  SessionData,
  SessionOptions,
  SessionStore
} from "../core/types.js";
import { attachCookies } from "./cookies.js";

/**
 * Simple in-memory session store primarily suited for development/testing.
 */
class InMemorySessionStore implements SessionStore {
  private readonly store = new Map<string, SessionData>();

  get(id: string): SessionData | undefined {
    return this.store.get(id);
  }

  set(id: string, data: SessionData, ttl: number): void {
    this.store.set(id, data);
    setTimeout(() => {
      if (this.store.get(id)?.touchedAt === data.touchedAt) {
        this.store.delete(id);
      }
    }, ttl).unref?.();
  }

  destroy(id: string): void {
    this.store.delete(id);
  }
}

const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

export const memorySessionStore = new InMemorySessionStore();

export interface SessionManager {
  options: RequiredSessionOptions;
  load(req: Request, res: Response): void;
}

interface RequiredSessionOptions extends SessionOptions {
  name: string;
  secret: string;
  ttl: number;
  rolling: boolean;
  cookie: CookieOptions;
  store: SessionStore;
}

function resolveSessionOptions(options?: SessionOptions): RequiredSessionOptions {
  return {
    name: options?.name ?? "jason.sid",
    secret: options?.secret ?? randomBytes(16).toString("hex"),
    ttl: options?.ttl ?? DEFAULT_TTL,
    rolling: options?.rolling ?? true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      ...(options?.cookie ?? {})
    },
    store: options?.store ?? memorySessionStore
  };
}

function generateSessionId(): string {
  return randomBytes(18).toString("base64url");
}

/**
 * Creates a session manager responsible for loading/persisting session data.
 */
export function createSessionManager(options?: SessionOptions): SessionManager {
  const resolved = resolveSessionOptions(options);

  async function load(req: Request, res: Response) {
    attachCookies(req, resolved.secret);
    const existingId = req.signedCookies[resolved.name] ?? req.cookies[resolved.name];
    let sessionId = existingId ?? generateSessionId();
    const now = Date.now();

    let session = await Promise.resolve(resolved.store.get(sessionId));
    if (!session) {
      session = {
        id: sessionId,
        createdAt: now,
        touchedAt: now,
        data: {}
      };
    } else {
      session.touchedAt = now;
    }

    req.session = session;

    await Promise.resolve(resolved.store.set(sessionId, session, resolved.ttl));

    res.cookie(resolved.name, sessionId, {
      ...resolved.cookie,
      maxAge: resolved.ttl / 1000,
      signed: true
    });

    res.on("finish", () => {
      if (req.session) {
        Promise.resolve(resolved.store.set(req.session.id, req.session, resolved.ttl)).catch(
          () => {}
        );
      }
    });
  }

  return {
    options: resolved,
    load
  };
}
