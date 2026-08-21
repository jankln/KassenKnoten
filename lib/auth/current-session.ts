import { cookies } from "next/headers";
import { getEnv, isSecureOrigin } from "@/lib/env";
import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type Identity,
  type Session,
} from "./session";

/**
 * Session access for server components and server actions.
 *
 * Kept apart from `session.ts` so the crypto stays testable without Next's request
 * context, and so the proxy can verify a token it reads from the raw request.
 */

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value, getEnv().SESSION_SECRET);
}

/**
 * The session, or an error. Every server action that touches household data calls this:
 * the proxy is a gate, not the gate, and a single wrong matcher must not be enough to
 * expose anything.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session;
}

export async function startSession(identity: Identity): Promise<void> {
  const env = getEnv();
  const token = await createSessionToken(identity, env.SESSION_SECRET);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureOrigin(env),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
