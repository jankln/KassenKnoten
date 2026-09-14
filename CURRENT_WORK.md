# Current work

**Feature:** F04b – OIDC sign-in, optional, chosen before and after install
**Status:** in progress
**Started:** 2026-09-14

## Goal

A household that runs an identity provider (Authentik, or any OIDC provider) can sign in
with it instead of — or next to — the shared password. Whether it is used is decided
before the first start, in `.env`, and can be changed afterwards in the settings without
touching the container. A household that never configures it sees exactly the app it has
today.

## Scope

- In: Authorization Code flow with PKCE against `OIDC_ISSUER` (discovery, token exchange,
  ID token verified against the provider's JWKS with `jose`). No new dependency.
- In: connection details in the environment only — `OIDC_ISSUER`, `OIDC_CLIENT_ID`,
  `OIDC_CLIENT_SECRET`, `OIDC_PROVIDER_NAME`. The client secret never reaches the
  database, on the same reasoning as the password hash and the TOTP secret.
- In: `AUTH_MODE` accepts `local`, `oidc` and `both` and is the **starting point**: which
  sign-in methods are switched on before anyone has touched the settings.
- In: **Settings → Sign-in**: switch the password and the provider on or off, and keep the
  e-mail allowlist. Both are stored in `app_setting`; once saved there, they win over
  `AUTH_MODE` and `OIDC_ALLOWED_EMAILS`, and the card says so.
- In: the allowlist is seeded from `OIDC_ALLOWED_EMAILS` and edited in the app, as
  `docs/PLAN.md` §2 always intended.
- In: an existing session ends when the method that proved it is switched off, or when an
  OIDC e-mail is removed from the allowlist.
- In: login screen shows the password form, the provider button, or both.
- In: `.env.example`, README (setup, Authentik walkthrough, security), `docs/PLAN.md` §5
  and roadmap.
- Out: logging out at the provider (RP-initiated logout). Signing out ends the app
  session; the provider session is the provider's.
- Out: TOTP for OIDC sign-ins. A second factor there belongs to the provider.
- Out: per-person accounts. An OIDC identity is still "someone allowed into this
  household", not a member.

## Plan

- [ ] `lib/auth/methods.ts` — pure: effective methods from what is configured and what is
      chosen; which changes are allowed (lockout guards). Tests.
- [ ] `lib/auth/allowlist.ts` — pure: parse, normalise, match e-mails. Tests.
- [ ] `lib/auth/oidc.ts` — PKCE (RFC 7636 vector), authorization URL, transaction cookie,
      discovery, code exchange, ID token verification. Tests with a local key pair.
- [ ] `lib/env.ts` — new variables, `AUTH_MODE` values, password hash optional when OIDC
      carries sign-in. Tests.
- [ ] `server/services/auth-settings.ts` — read/write the chosen methods and the allowlist
      in `app_setting`, falling back to the environment. Tests.
- [ ] Route handlers: `/login/oidc` (start), `/login/oidc/callback`, `/login/ended`
      (clears a session that is no longer allowed).
- [ ] `getSession()` re-checks method and allowlist; the app layout sends an invalidated
      session to `/login/ended` instead of throwing.
- [ ] Login page: password form and/or provider button, error from the callback.
- [ ] Settings card: two switches, allowlist editor, guard messages. Copy in `en.ts` and
      `de.ts`.
- [ ] `.env.example`, README, `docs/PLAN.md`.
- [ ] `npm run check`, then 375 px, then an end-to-end sign-in against a local provider.

## Notes / decisions

- **Configured is not the same as switched on.** The environment says what is _possible_
  (a password hash exists, a provider is set up); `AUTH_MODE` and later the settings say
  what is _used_. The effective set is the intersection. That is what lets a household
  install with the provider set up but off, and switch it on later.
- **The way out is the environment.** If the only switched-on method stops being
  available — the provider variables are removed — every configured method comes back.
  Removing `OIDC_ISSUER` and restarting is therefore the documented recovery from a
  broken provider, the same shape as `EXTENSIONS_ENABLED=false`.
- **Lockout guards in the settings:** at least one method stays on; the password can only
  be switched off from a session that signed in through the provider (proof it works for
  somebody on the list); in provider-only mode the allowlist cannot be emptied and the
  signed-in e-mail cannot be removed.
- **`email_verified: false` is refused.** A provider with open enrolment could otherwise
  hand out an account carrying the household's address. A missing claim is accepted,
  because several providers do not send it.
- The OIDC transaction (state, nonce, PKCE verifier, return path) lives in a short-lived
  encrypted cookie keyed from `SESSION_SECRET` with its own HKDF label — no server-side
  store, so a restart mid-login costs one retry, nothing more.

## Resume here

Start with `lib/auth/methods.ts` and its tests; everything else asks it which methods are on.
