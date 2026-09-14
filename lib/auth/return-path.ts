/**
 * Where a sign-in may send the browser afterwards.
 *
 * The value arrives from the address bar (`/login?weiter=…`), so it is attacker-shaped by
 * definition. Only a path on this instance survives: `//evil.example` and `/\evil.example`
 * are both paths to a naive check and both are read by browsers as another host, which
 * would turn the sign-in into an open redirect.
 *
 * Paths under `/login` are refused too. None of them is a destination, and `/login/ended`
 * clears the session — a crafted link would otherwise sign somebody in and straight back
 * out.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /^\/login(?:[/?#]|$)/.test(value)
  ) {
    return "/";
  }
  return value;
}
