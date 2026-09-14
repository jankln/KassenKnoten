# Current work

**Status:** idle — nothing in flight.

Last finished: **fix #15** — backups carry household data only; sign-in configuration
(`auth.*`) and extension switches (`extensions.*`) stay out of new files and survive a
restore, including from older files that still carry them.

Next up (agreed 2026-09-14): automatic backups.

Notes for whoever comes next:

- #15 shipped in 1.4.0 with sign-in settings and is on `main` only; it belongs in the next
  release.
- The README's tests badge is still a static number.
- Not yet tried against a live Authentik, only against `oidc-provider`.

See `docs/WORKFLOW.md` for how this file is used.
