# Current work

**Feature:** Fix #4 – password sign-in forgets the page that was requested
**Status:** in progress
**Started:** 2026-09-14

## Goal

Signing in with the household password returns to the page the proxy sent somebody away
from, query string included, instead of always landing on the overview.

## Scope

- In: the proxy keeps the query in `weiter`; the password form carries it; `signIn`
  redirects to it through the same path check the provider sign-in uses.
- In: that check moves out of `lib/auth/oidc.ts` into its own module, since two sign-in
  methods now share it, and it refuses paths under `/login` so a crafted link cannot
  sign somebody straight back out.
- Out: anything else about the login screen.

## Plan

- [ ] `lib/auth/return-path.ts` with tests; `oidc.ts` imports it
- [ ] `proxy.ts` keeps the search string
- [ ] hidden field in the password form, `signIn` redirects to it
- [ ] `npm run check`, then try it against the dev server

## Resume here

Start with `lib/auth/return-path.ts`.
