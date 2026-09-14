import { createHash, hkdfSync, randomBytes } from "node:crypto";
import {
  EncryptJWT,
  jwtDecrypt,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

/**
 * OpenID Connect, Authorization Code flow with PKCE.
 *
 * Written against `jose` rather than a client library because the flow this app needs is
 * small and fixed: one provider, one confidential or public client, one scope set. What
 * matters is that every check the spec asks of a relying party is visibly here — the
 * issuer, the audience, the expiry, the nonce, the state — and each of them is tested.
 *
 * Nothing in this module reads the environment, the database or the clock implicitly. The
 * route handlers are the I/O around it.
 */

/** How long a sign-in may take between leaving for the provider and coming back. */
export const TRANSACTION_TTL_SECONDS = 10 * 60;

export const TRANSACTION_COOKIE = "kk_oidc";

/** Where the provider sends the browser back. Registered with the provider. */
export const CALLBACK_PATH = "/login/oidc/callback";

export interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
}

/** What the provider vouched for, after every check has passed. */
export interface OidcIdentity {
  subject: string;
  email?: string;
  /** `undefined` when the provider does not send the claim at all. */
  emailVerified?: boolean;
  name?: string;
}

export type OidcFailure =
  /** The provider could not be reached, or answered something that is not OIDC. */
  | "provider"
  /** The ID token failed verification. */
  | "token";

export class OidcError extends Error {
  constructor(
    readonly failure: OidcFailure,
    message: string,
  ) {
    super(message);
    this.name = "OidcError";
  }
}

type Fetch = typeof fetch;

/* ------------------------------------------------------------------------- *
 * PKCE, state, nonce
 * ------------------------------------------------------------------------- */

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** RFC 7636 §4.2, S256. The plain method exists in the spec and has no place here. */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/* ------------------------------------------------------------------------- *
 * Discovery
 * ------------------------------------------------------------------------- */

/**
 * Where the discovery document for an issuer lives.
 *
 * Authentik issuers end in a slash (`…/application/o/kassenknoten/`), and joining naively
 * produces `//.well-known`, which Authentik answers with a 404. The slash is trimmed for
 * the lookup only; the issuer itself is compared exactly, as the spec requires.
 */
export function discoveryUrl(issuer: string): string {
  return `${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`;
}

export async function discover(
  issuer: string,
  fetchImpl: Fetch = fetch,
): Promise<Discovery> {
  let body: unknown;
  try {
    const response = await fetchImpl(discoveryUrl(issuer), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    body = await response.json();
  } catch (error) {
    throw new OidcError(
      "provider",
      `Could not load ${discoveryUrl(issuer)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const document = body as Partial<Record<keyof Discovery, unknown>>;
  for (const key of [
    "issuer",
    "authorization_endpoint",
    "token_endpoint",
    "jwks_uri",
  ] as const) {
    if (typeof document[key] !== "string") {
      throw new OidcError("provider", `The discovery document has no ${key}.`);
    }
  }

  // A mismatch here is nearly always a missing or extra trailing slash in OIDC_ISSUER,
  // and every token would fail on it later with a far less helpful message.
  if (document.issuer !== issuer) {
    throw new OidcError(
      "provider",
      `OIDC_ISSUER is "${issuer}", but the provider calls itself "${String(document.issuer)}". ` +
        "They must match exactly, trailing slash included.",
    );
  }

  return {
    issuer: document.issuer as string,
    authorization_endpoint: document.authorization_endpoint as string,
    token_endpoint: document.token_endpoint as string,
    jwks_uri: document.jwks_uri as string,
    ...(typeof document.userinfo_endpoint === "string"
      ? { userinfo_endpoint: document.userinfo_endpoint }
      : {}),
  };
}

/* ------------------------------------------------------------------------- *
 * Leaving for the provider
 * ------------------------------------------------------------------------- */

export function authorizationUrl(input: {
  discovery: Discovery;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  verifier: string;
}): URL {
  const url = new URL(input.discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", pkceChallenge(input.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

/**
 * Only a path on this instance may be returned to after signing in.
 *
 * `//evil.example` and `/\evil.example` are both paths to a naive check and both are read
 * by browsers as another host, which would turn the sign-in into an open redirect.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }
  return value;
}

/* ------------------------------------------------------------------------- *
 * The transaction cookie
 * ------------------------------------------------------------------------- */

/**
 * Everything the callback needs to recognise its own sign-in.
 *
 * Kept in an encrypted cookie rather than on the server: there is nothing to clean up, and
 * a restart halfway through a sign-in costs one more click, not an inconsistent store. The
 * verifier in particular must never be readable by the browser, which is why this is JWE
 * and not merely signed.
 */
export interface Transaction {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
}

function transactionKey(secret: string): Uint8Array {
  // Its own HKDF label, so this key is never the session key.
  return new Uint8Array(
    hkdfSync("sha256", secret, "kassenknoten-oidc", "transaction", 32),
  );
}

export async function sealTransaction(
  transaction: Transaction,
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new EncryptJWT({ ...transaction })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TRANSACTION_TTL_SECONDS)
    .setAudience("kassenknoten-oidc")
    .encrypt(transactionKey(secret));
}

export async function openTransaction(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<Transaction | null> {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtDecrypt(token, transactionKey(secret), {
      audience: "kassenknoten-oidc",
      currentDate: now,
    });
    const { state, nonce, verifier, returnTo } = payload;
    if (
      typeof state !== "string" ||
      typeof nonce !== "string" ||
      typeof verifier !== "string" ||
      typeof returnTo !== "string"
    ) {
      return null;
    }
    return { state, nonce, verifier, returnTo: safeReturnPath(returnTo) };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------- *
 * Coming back
 * ------------------------------------------------------------------------- */

/**
 * Trade the authorization code for an ID token.
 *
 * With a client secret the client authenticates with HTTP Basic, which every provider
 * must support (RFC 6749 §2.3.1); without one it is a public client and PKCE is what
 * binds the code to this browser.
 */
export async function exchangeCode(input: {
  discovery: Discovery;
  clientId: string;
  clientSecret?: string;
  code: string;
  verifier: string;
  redirectUri: string;
  fetchImpl?: Fetch;
}): Promise<{ idToken: string; accessToken?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
  });
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (input.clientSecret) {
    const user = encodeURIComponent(input.clientId);
    const password = encodeURIComponent(input.clientSecret);
    headers.authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  } else {
    body.set("client_id", input.clientId);
  }

  let json: { id_token?: unknown; access_token?: unknown; error?: unknown };
  try {
    const response = await (input.fetchImpl ?? fetch)(input.discovery.token_endpoint, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });
    json = (await response.json()) as typeof json;
    if (!response.ok) {
      throw new Error(
        typeof json.error === "string" ? json.error : `HTTP ${response.status}`,
      );
    }
  } catch (error) {
    throw new OidcError(
      "provider",
      `The token exchange failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (typeof json.id_token !== "string") {
    throw new OidcError("provider", "The token response carries no id_token.");
  }
  return {
    idToken: json.id_token,
    ...(typeof json.access_token === "string"
      ? { accessToken: json.access_token }
      : {}),
  };
}

/**
 * Fill in the profile from the userinfo endpoint when the ID token does not carry it.
 *
 * In the code flow a provider following OpenID Connect Core §5.4 to the letter puts the
 * `email` and `profile` claims only there, not in the ID token — `oidc-provider` does by
 * default, and so does Authentik when "Include claims in id_token" is unticked. Without
 * this, such a provider signs everybody in as somebody with no address, and the allowlist
 * refuses them all.
 *
 * The response is only trusted for the subject the verified ID token named (§5.3.2):
 * a userinfo answer about somebody else is refused rather than merged.
 */
export async function withUserinfo(input: {
  identity: OidcIdentity;
  discovery: Discovery;
  accessToken?: string;
  fetchImpl?: Fetch;
}): Promise<OidcIdentity> {
  const { identity, discovery, accessToken } = input;
  if (identity.email || !discovery.userinfo_endpoint || !accessToken) {
    return identity;
  }

  let claims: Record<string, unknown>;
  try {
    const response = await (input.fetchImpl ?? fetch)(discovery.userinfo_endpoint, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    claims = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    throw new OidcError(
      "provider",
      `The userinfo request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (claims.sub !== identity.subject) {
    throw new OidcError("token", "The userinfo response is about another subject.");
  }
  return { ...identity, ...profileFrom(claims), subject: identity.subject };
}

function profileFrom(claims: Record<string, unknown>): Omit<OidcIdentity, "subject"> {
  const name =
    typeof claims.name === "string"
      ? claims.name
      : typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : undefined;
  return {
    ...(typeof claims.email === "string" ? { email: claims.email } : {}),
    ...(typeof claims.email_verified === "boolean"
      ? { emailVerified: claims.email_verified }
      : {}),
    ...(name ? { name } : {}),
  };
}

/**
 * Verify an ID token the way OpenID Connect Core §3.1.3.7 asks.
 *
 * Signature against the provider's keys, issuer exact, this client in the audience and as
 * `azp` when there are several, not expired, and the nonce this browser sent. `jose`
 * refuses unsigned tokens on its own; the rest is spelled out.
 */
export async function verifyIdToken(input: {
  idToken: string;
  issuer: string;
  clientId: string;
  nonce: string;
  keys: JWTVerifyGetKey;
  now?: Date;
}): Promise<OidcIdentity> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(input.idToken, input.keys, {
      issuer: input.issuer,
      audience: input.clientId,
      requiredClaims: ["sub", "exp", "iat"],
      clockTolerance: 60,
      ...(input.now ? { currentDate: input.now } : {}),
    }));
  } catch (error) {
    throw new OidcError(
      "token",
      `The ID token did not verify: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (payload.nonce !== input.nonce) {
    throw new OidcError("token", "The ID token nonce does not match this sign-in.");
  }
  if (
    Array.isArray(payload.aud) &&
    payload.aud.length > 1 &&
    payload.azp !== input.clientId
  ) {
    throw new OidcError("token", "The ID token was issued to another party.");
  }

  return { subject: payload.sub as string, ...profileFrom(payload) };
}
