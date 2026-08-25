# Current work

**Feature:** F23 – Two-factor sign-in with TOTP
**Status:** in progress
**Started:** 2026-08-25

## Goal

Signing in can require a second factor: the household password plus a six-digit code from
an authenticator app. A leaked password stops being enough on its own. Setting
`TOTP_SECRET` turns it on; leaving it unset leaves the login exactly as it is today.

## Scope

- In: RFC 6238 TOTP in `lib/auth/`, a replay guard, the code field on the login screen, a
  `npm run auth:totp` setup script, the `TOTP_SECRET` environment variable, and the German
  copy for all of it moved into `lib/i18n/de.ts`.
- Out: recovery codes, passkeys/WebAuthn, OIDC. **F04b stays on the roadmap untouched** —
  the seam for it (`Identity.method: "local" | "oidc"`) is not modified by this work.

## Decisions

- **The secret lives in `.env`, not in the database.** `lib/env.ts` and `docs/PLAN.md`
  both record a deliberate property — "a copy of the SQLite file is not a copy of the
  password". A TOTP secret in SQLite would break exactly that, putting the second factor
  next to the money it protects. It also removes the need for recovery codes: losing the
  phone is not a lockout, because the secret can be re-scanned from `.env`.
- **One form, not two steps.** With a single shared password there is no "which user is
  this" step for a two-stage flow to serve. Two stages would need a half-authenticated
  intermediate token — another cookie, another expiry, another thing to get wrong.
- **Replay protection is part of it.** A code is valid for its 30-second step, and with
  ±1 step of tolerance for up to 90. Without a guard, a code read over someone's shoulder
  works a second time inside that window. In-process and in memory, on the same reasoning
  `lib/auth/rate-limit.ts` already documents.
- **No new `AUTH_MODE` value.** 2FA is on as soon as `TOTP_SECRET` is set. A config value
  that silently disables a security feature is worse than none.
- The household runs Authentik already and chose TOTP anyway: it keeps KassenKnoten
  signable-in when the identity provider is not reachable, and it gives self-hosters
  without an IdP real 2FA for no extra infrastructure.

## Plan

- [ ] `lib/auth/totp.ts` — base32, code generation, verification with a tolerance window,
      `otpauth://` URI. Pure, no ambient clock: `now` is a parameter.
- [ ] `lib/auth/totp.test.ts` — the published RFC 6238 test vectors, plus the window,
      expiry and malformed input
- [ ] `lib/auth/totp-replay.ts` + test — refuse a step that was already used
- [ ] `scripts/totp-secret.ts` → `npm run auth:totp`, in the shape of `hash-password.ts`
- [ ] `lib/env.ts` — optional `TOTP_SECRET`, validated as base32 with a named error
- [ ] `lib/auth/actions.ts` — rate limit → password → code → replay guard → session
- [ ] Login screen: the code field, and the existing hardcoded German moved to `de.ts`
- [ ] `.env.example`, README, `docs/PLAN.md`, `npm run check`, 375 px

## Notes / decisions

- Base32 is `A–Z2–7`, so unlike the argon2id hash it carries no `$` and needs no base64
  wrapper to survive `.env` and docker-compose variable expansion.
- The existing `loginLimiter` already covers this: it counts an attempt when the code is
  wrong too, because it is only reset on full success. Five tries per quarter hour against
  a million possible codes is the whole brute-force story; a second limiter would be
  ballast.

## Resume here

Start with `lib/auth/totp.ts` and its RFC test vectors — everything else depends on the
shape of `verifyTotp`.

See `docs/WORKFLOW.md` for how this file is used.
