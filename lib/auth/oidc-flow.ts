import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createRemoteJWKSet } from "jose";
import { isAllowed } from "@/lib/auth/allowlist";
import { getEnv, isSecureOrigin, oidcRedirectUri, type OidcConfig } from "@/lib/env";
import { getSignInState } from "@/server/services/sign-in";
import { startSession } from "./current-session";
import {
  authorizationUrl,
  discover,
  exchangeCode,
  OidcError,
  openTransaction,
  randomToken,
  safeReturnPath,
  sealTransaction,
  TRANSACTION_COOKIE,
  TRANSACTION_TTL_SECONDS,
  verifyIdToken,
  withUserinfo,
  type Discovery,
} from "./oidc";

/**
 * The two halves of a provider sign-in, as the route handlers call them.
 *
 * Each returns where the browser goes next instead of redirecting itself: `redirect()`
 * works by throwing, and a throw inside the `try` that turns provider failures into a
 * friendly message would be caught as one.
 */

/** Why a provider sign-in did not end in a session. Shown on the login screen. */
export type OidcSignInError =
  /** Provider sign-in is not switched on, or not configured. */
  | "disabled"
  /** The provider could not be reached or misbehaved; details go to the server log. */
  | "provider"
  /** Took too long, was started in another tab, or was cancelled at the provider. */
  | "expired"
  /** The provider says the address is not verified. */
  | "unverified"
  /** Signed in fine, but not somebody this household has allowed in. */
  | "denied";

export function loginErrorPath(error: OidcSignInError): string {
  return `/login?fehler=${error}`;
}

/* ------------------------------------------------------------------------- *
 * Provider metadata, cached per process
 * ------------------------------------------------------------------------- */

interface Provider {
  discovery: Discovery;
  keys: ReturnType<typeof createRemoteJWKSet>;
}

let cached: { issuer: string; provider: Promise<Provider> } | undefined;

/**
 * Discovery and the key set, loaded once per process.
 *
 * A failed load is not cached: a provider that was down at the first sign-in attempt must
 * not stay "down" until the container restarts. `jose` refreshes the key set on its own
 * when a token names a key it has not seen, which covers key rotation.
 */
function providerFor(config: OidcConfig): Promise<Provider> {
  if (cached?.issuer !== config.issuer) {
    const provider = discover(config.issuer).then((discovery) => ({
      discovery,
      keys: createRemoteJWKSet(new URL(discovery.jwks_uri)),
    }));
    provider.catch(() => {
      if (cached?.provider === provider) {
        cached = undefined;
      }
    });
    cached = { issuer: config.issuer, provider };
  }
  return cached.provider;
}

function enabledProvider(): OidcConfig | undefined {
  const env = getEnv();
  return env.oidc && getSignInState(env).effective.oidc ? env.oidc : undefined;
}

/* ------------------------------------------------------------------------- *
 * Leaving
 * ------------------------------------------------------------------------- */

export async function beginOidcSignIn(returnTo: string | null): Promise<string> {
  const config = enabledProvider();
  if (!config) {
    return loginErrorPath("disabled");
  }

  let provider: Provider;
  try {
    provider = await providerFor(config);
  } catch (error) {
    console.error("OIDC sign-in could not start.", error);
    return loginErrorPath("provider");
  }

  const env = getEnv();
  const transaction = {
    state: randomToken(),
    nonce: randomToken(),
    verifier: randomToken(),
    returnTo: safeReturnPath(returnTo),
  };

  const store = await cookies();
  store.set(
    TRANSACTION_COOKIE,
    await sealTransaction(transaction, env.SESSION_SECRET),
    {
      httpOnly: true,
      // Lax, not Strict: the provider sends the browser back with a top-level cross-site
      // navigation, and a Strict cookie would not come with it.
      sameSite: "lax",
      secure: isSecureOrigin(env),
      path: "/login/oidc",
      maxAge: TRANSACTION_TTL_SECONDS,
    },
  );

  return authorizationUrl({
    discovery: provider.discovery,
    clientId: config.clientId,
    redirectUri: oidcRedirectUri(env),
    ...transaction,
  }).toString();
}

/* ------------------------------------------------------------------------- *
 * Coming back
 * ------------------------------------------------------------------------- */

export async function completeOidcSignIn(params: URLSearchParams): Promise<string> {
  const env = getEnv();
  const store = await cookies();
  const transaction = await openTransaction(
    store.get(TRANSACTION_COOKIE)?.value,
    env.SESSION_SECRET,
  );
  // One transaction, one attempt — whatever happens next.
  store.delete({ name: TRANSACTION_COOKIE, path: "/login/oidc" });

  const config = enabledProvider();
  if (!config) {
    return loginErrorPath("disabled");
  }

  const state = params.get("state");
  if (!transaction || !state || !sameToken(state, transaction.state)) {
    return loginErrorPath("expired");
  }
  // The provider's own refusal, e.g. `access_denied` when somebody cancels its consent
  // screen or Authentik's application policy does not let them through.
  const code = params.get("code");
  if (params.get("error") || !code) {
    console.error("OIDC provider returned an error.", params.get("error"));
    return loginErrorPath("expired");
  }

  let identity;
  try {
    const provider = await providerFor(config);
    const tokens = await exchangeCode({
      discovery: provider.discovery,
      clientId: config.clientId,
      ...(config.clientSecret ? { clientSecret: config.clientSecret } : {}),
      code,
      verifier: transaction.verifier,
      redirectUri: oidcRedirectUri(env),
    });
    identity = await withUserinfo({
      identity: await verifyIdToken({
        idToken: tokens.idToken,
        issuer: provider.discovery.issuer,
        clientId: config.clientId,
        nonce: transaction.nonce,
        keys: provider.keys,
      }),
      discovery: provider.discovery,
      ...(tokens.accessToken ? { accessToken: tokens.accessToken } : {}),
    });
  } catch (error) {
    console.error(
      "OIDC sign-in failed.",
      error instanceof OidcError ? error.message : error,
    );
    return loginErrorPath("provider");
  }

  // A provider with open enrolment could otherwise hand out an account carrying the
  // household's address to whoever typed it in. A missing claim is accepted: several
  // providers do not send it, and refusing them would make the feature unusable there.
  if (identity.emailVerified === false) {
    return loginErrorPath("unverified");
  }
  if (!isAllowed(getSignInState(env).allowlist, identity.email)) {
    console.warn(
      `OIDC sign-in refused: ${identity.email ?? "(no e-mail claim)"} is not on the allowlist.`,
    );
    return loginErrorPath("denied");
  }

  await startSession({
    subject: identity.subject,
    method: "oidc",
    ...(identity.name ? { name: identity.name } : {}),
    ...(identity.email ? { email: identity.email } : {}),
  });
  return transaction.returnTo;
}

function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
