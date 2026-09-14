# Current work

**Status:** idle — nothing in flight.

Last finished: **1.4.0 released.** `latest`, `1.4` and `1.4.0` are one manifest on amd64
and arm64, carrying optional sign-in with an identity provider (F04b), the trend readout
(F30) and fixes #4 to #9. The release carries `docker-compose.yml` and `env.example`, so
the README's `releases/latest/download` commands fetch the new OIDC block.

Nothing open on `docs/PLAN.md`.

Notes for whoever comes next:

- Not yet tried against a live **Authentik**, only against `oidc-provider`. The README
  covers the issuer's trailing slash and the signing key.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first. Whether an English instance should show `€1,234.56` is an open
  product decision, not an oversight.

See `docs/WORKFLOW.md` for how this file is used.
