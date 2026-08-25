# Current work

**Status:** idle — nothing in flight.

Last finished: **F23 – Two-factor sign-in with TOTP**. Set `TOTP_SECRET` and the login
asks for a six-digit code from an authenticator app alongside the household password;
leave it unset and nothing about signing in changes. `npm run auth:totp` prints the
secret, a scannable QR code and the line for `.env`.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request. The seam
for it is untouched — `Identity.method` in `lib/auth/session.ts` still knows nothing about
how an identity was proven.

Note for whoever comes next: the secret is deliberately an environment variable, not a
database row, and that is what makes recovery codes unnecessary — losing the phone is not
a lockout, because the secret can be scanned again from `.env`. `requiresSecondFactor()`
in `lib/env.ts` is the single predicate for "is 2FA on"; asking that question a second way
is what produced the one real bug in this feature, a login screen demanding a code that
the server did not verify.

See `docs/WORKFLOW.md` for how this file is used.
