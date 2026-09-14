/**
 * Who may sign in through the identity provider.
 *
 * A provider proves that somebody holds an account; it says nothing about whether that
 * account belongs in this household. Authentik in particular is usually shared with the
 * rest of a home server, so "has a login there" includes the guest account and the
 * neighbour's kid. The allowlist is the part that says who is actually meant.
 *
 * Addresses are compared case-insensitively. The local part of an e-mail address is
 * case-sensitive by the letter of RFC 5321, and no provider anyone runs at home treats it
 * that way; refusing `Alex@example.com` because the list says `alex@example.com` would be
 * correct and useless.
 */

/** A deliberately loose shape check: one `@`, something either side, no whitespace. */
const EMAIL = /^[^\s@]+@[^\s@]+$/;

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return EMAIL.test(normaliseEmail(value));
}

/**
 * Parse a comma-, semicolon- or whitespace-separated list, as written in
 * `OIDC_ALLOWED_EMAILS`. Duplicates collapse and malformed entries are returned
 * separately, so the caller can name them instead of silently dropping somebody.
 */
export function parseAllowlist(value: string | undefined): {
  emails: string[];
  invalid: string[];
} {
  const entries = (value ?? "")
    .split(/[\s,;]+/)
    .map(normaliseEmail)
    .filter((entry) => entry !== "");

  const emails: string[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    if (!isEmail(entry)) {
      invalid.push(entry);
    } else if (!emails.includes(entry)) {
      emails.push(entry);
    }
  }
  return { emails, invalid };
}

export function isAllowed(
  allowlist: readonly string[],
  email: string | undefined,
): boolean {
  if (!email) {
    return false;
  }
  const wanted = normaliseEmail(email);
  return allowlist.some((entry) => normaliseEmail(entry) === wanted);
}

export type AllowlistChangeRefusal =
  /** Provider-only, and nobody left who may use the provider. */
  | "emptyWhileOnlyProvider"
  /** The signed-in address would be removed, ending the session asking for it. */
  | "ownAddress"
  | "invalid";

/**
 * Whether the allowlist may become `next`.
 *
 * The address of the session making the change stays on the list: removing it would end
 * that session on the next request, which is a sign-out disguised as an edit.
 */
export function checkAllowlistChange(input: {
  next: readonly string[];
  /** Whether sign-in would be provider-only after this change. */
  providerOnly: boolean;
  session: { method: "local" | "oidc"; email?: string };
}): AllowlistChangeRefusal | undefined {
  const { next, providerOnly, session } = input;

  if (next.some((entry) => !isEmail(entry))) {
    return "invalid";
  }
  if (providerOnly && next.length === 0) {
    return "emptyWhileOnlyProvider";
  }
  if (session.method === "oidc" && !isAllowed(next, session.email)) {
    return "ownAddress";
  }
  return undefined;
}
