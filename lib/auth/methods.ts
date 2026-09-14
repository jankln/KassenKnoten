/**
 * Which ways of signing in are switched on.
 *
 * Two questions that are easy to conflate are kept apart here. What is **configured** is a
 * fact about the environment: a password hash exists, a provider is set up. What is
 * **chosen** is a decision by the household: `AUTH_MODE` before the first start, the
 * settings screen afterwards. Only a method that is both counts.
 *
 * Pure and clock-free, like the rest of the auth primitives, because this is the function
 * that decides whether a household can reach its own finances.
 */

export const SIGN_IN_METHODS = ["local", "oidc"] as const;
export type SignInMethod = (typeof SIGN_IN_METHODS)[number];

export type MethodSet = Record<SignInMethod, boolean>;

/**
 * The methods in effect.
 *
 * When nothing chosen is still configured — the household picked provider-only and the
 * provider variables have since been removed — every configured method comes back rather
 * than none. That is the documented way out of a broken provider: take it out of `.env`,
 * restart, and the password works again. An empty result is impossible as long as the
 * environment configures anything, and `getEnv()` refuses to start when it does not.
 */
export function effectiveMethods(configured: MethodSet, chosen: MethodSet): MethodSet {
  const both: MethodSet = {
    local: configured.local && chosen.local,
    oidc: configured.oidc && chosen.oidc,
  };
  return both.local || both.oidc ? both : { ...configured };
}

export type MethodChangeRefusal =
  /** Switching every method off would leave nobody able to sign in. */
  | "noneLeft"
  /** The environment does not configure this method, so it cannot be switched on. */
  | "notConfigured"
  /**
   * The method this very session was proven with cannot be switched off from it.
   *
   * Switching the password off is therefore only possible after somebody has actually
   * come in through the provider — until then nothing shows that it works for anyone on
   * the list. The other direction is the same rule: switching the provider off from a
   * provider session would end that session mid-click, so it asks for a password sign-in
   * first, which also proves the password is still known.
   */
  | "ownMethod";

/**
 * Whether the household may change the chosen methods to `next`.
 *
 * Judged against what would be **in effect** afterwards rather than what is ticked,
 * because that is what decides whether the next sign-in works.
 */
export function checkMethodChange(input: {
  configured: MethodSet;
  next: MethodSet;
  /** How the session asking for the change was proven. */
  sessionMethod: SignInMethod;
}): MethodChangeRefusal | undefined {
  const { configured, next, sessionMethod } = input;

  if ((next.local && !configured.local) || (next.oidc && !configured.oidc)) {
    return "notConfigured";
  }
  if (!next.local && !next.oidc) {
    return "noneLeft";
  }
  if (!next[sessionMethod]) {
    return "ownMethod";
  }
  return undefined;
}

/** The starting point `AUTH_MODE` describes, before the settings have been saved. */
export function methodsForMode(mode: "local" | "oidc" | "both"): MethodSet {
  return { local: mode !== "oidc", oidc: mode !== "local" };
}
