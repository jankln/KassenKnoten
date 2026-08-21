import { hkdfSync } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";

/**
 * Session tokens.
 *
 * The cookie is **encrypted**, not merely signed: its contents never leave the server in
 * readable form. This module knows nothing about how an identity was proven — the local
 * password today, an OIDC callback tomorrow — so adding Authentik means adding a caller,
 * not rewriting this.
 */

export const SESSION_COOKIE = "kk_session";

/** A week. Long enough for a household tablet, short enough to expire a stolen laptop. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface Identity {
  /** Stable id of whoever signed in. "household" for the shared password. */
  subject: string;
  /** How the identity was proven. */
  method: "local" | "oidc";
  /** Display name, when the provider gives one. */
  name?: string;
  /** E-mail, when the provider gives one. */
  email?: string;
}

export interface Session extends Identity {
  /** Issued at, epoch seconds. */
  issuedAt: number;
  /** Expires at, epoch seconds. */
  expiresAt: number;
}

/**
 * Derive the encryption key from the configured secret. HKDF rather than a raw hash so
 * the same secret could later key other things without them sharing a key.
 */
function keyFor(secret: string): Uint8Array {
  return new Uint8Array(
    hkdfSync("sha256", secret, "kassenknoten-session", "encryption", 32),
  );
}

export async function createSessionToken(
  identity: Identity,
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);

  return new EncryptJWT({
    method: identity.method,
    ...(identity.name ? { name: identity.name } : {}),
    ...(identity.email ? { email: identity.email } : {}),
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setSubject(identity.subject)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .setIssuer("kassenknoten")
    .setAudience("kassenknoten")
    .encrypt(keyFor(secret));
}

/**
 * Decrypt and validate a session token. Returns `null` for every failure mode —
 * expired, tampered with, encrypted under a different secret, or simply nonsense —
 * because the caller's response is the same in all of them: send them to the login page.
 */
export async function readSessionToken(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<Session | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtDecrypt(token, keyFor(secret), {
      issuer: "kassenknoten",
      audience: "kassenknoten",
      currentDate: now,
    });

    if (!payload.sub || !payload.iat || !payload.exp) {
      return null;
    }
    const method = payload.method;
    if (method !== "local" && method !== "oidc") {
      return null;
    }

    return {
      subject: payload.sub,
      method,
      ...(typeof payload.name === "string" ? { name: payload.name } : {}),
      ...(typeof payload.email === "string" ? { email: payload.email } : {}),
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Whether a session is old enough to be worth re-issuing. Refreshing on every request
 * would rewrite the cookie constantly; refreshing past the halfway point keeps an active
 * household signed in without ever extending an abandoned session.
 */
export function shouldRefresh(session: Session, now: Date = new Date()): boolean {
  const elapsed = Math.floor(now.getTime() / 1000) - session.issuedAt;
  return elapsed > SESSION_TTL_SECONDS / 2;
}
