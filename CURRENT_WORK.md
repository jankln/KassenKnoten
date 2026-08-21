# Current work

**Feature:** F04 – Authentication (local password)
**Status:** in progress
**Started:** 2026-08-21

## Goal

Nothing in the app is reachable without signing in. A single shared household password
(argon2id, hash supplied via environment) unlocks an encrypted session cookie, and every
route is denied by default until that cookie verifies.

## Scope

- In: validated server environment, password hashing and verification, brute-force
  throttling, encrypted session cookie, `proxy.ts` deny-by-default gate, German login and
  logout, `/api/health`, and a `npm run auth:hash` helper to produce the hash.
- Out: OIDC / Authentik (F04b — the module boundary is drawn for it now, the code is not
  written yet), per-person accounts, password changes from inside the UI.

## Plan

- [ ] `lib/env.ts`: zod-validated server environment, one clear German error on misconfig
- [ ] `lib/auth/password.ts`: argon2id hash + verify
- [ ] `lib/auth/rate-limit.ts`: pure token bucket per client, unit-tested
- [ ] `lib/auth/session.ts`: encrypted JWE cookie, sliding expiry, tamper detection
- [ ] `proxy.ts`: deny everything except the login route, its action and `/api/health`
- [ ] `app/(auth)/login`: German login screen and server action
- [ ] Logout action and `/api/health` route
- [ ] `scripts/hash-password.ts` behind `npm run auth:hash`
- [ ] Tests: session round-trip, expired cookie, tampered cookie, wrong secret,
      rate limiter behaviour, password verify
- [ ] `npm run check` passes

## Notes / decisions

- **Authentik comes later, but the seam is drawn now.** The session module knows nothing
  about how the identity was proven; `signIn(identity)` is the only entry point, so the
  OIDC callback in F04b becomes a second caller rather than a rewrite.
- `AUTH_MODE` only accepts `local` for now. Accepting `oidc` while no OIDC code exists
  would mean shipping a config value that silently locks the user out.
- Sessions are encrypted (JWE, A256GCM) rather than merely signed, so the cookie never
  exposes its contents, and the key is derived from `SESSION_SECRET`.
- The proxy is a gate, not the gate: server actions verify the session themselves. A
  single misconfigured matcher must never be enough to expose household finances.

## Resume here

If interrupted: `npm run test` shows which auth module is unfinished; the app is unusable
until `proxy.ts` and the login route exist together.
