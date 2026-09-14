# Current work

**Status:** idle — nothing in flight.

Last finished: **F04b — optional sign-in with an identity provider.** Authentik or any
OpenID Connect provider, next to or instead of the household password. Before install it
is chosen in `.env` (`OIDC_*`, `AUTH_MODE=local|oidc|both`); after install under
Settings → Sign-in, where the password and the provider are switched on or off and the
e-mail allowlist is kept. Tested end to end against `oidc-provider` (the certified
reference implementation) in both claim styles — profile in the ID token, and profile only
on the userinfo endpoint — including refusal of unlisted and unverified addresses, a
forged state, immediate session revocation, provider-only from the first start, and the
`.env` recovery path.

Open on `docs/PLAN.md`: nothing on the roadmap. F30 and F04b are on `main` but in no tag
yet, so a release is the natural next step.

Notes for whoever comes next:

- Not yet tried against a live **Authentik**. The README walkthrough covers the two things
  most likely to bite there: the issuer's trailing slash, and choosing a signing key (without
  one Authentik signs with the client secret, and the token cannot be verified). If
  Authentik reports `email_verified: false` for real users, the sign-in says so; the fix
  belongs in its scope mapping, not in relaxing the check here.
- The status badges in the extensions card and on variable-cost cards use
  `bg-brass/15 text-brass-ink`, which is nearly unreadable in the dark theme. The new
  sign-in card uses `text-ink` instead; the two older ones are unchanged.
- `lib/format.ts` still builds every `Intl` formatter with a fixed `de-DE` locale, so an
  English instance reads "Juni 2026". Fixing it means threading the household locale into
  the formatters.

See `docs/WORKFLOW.md` for how this file is used.
