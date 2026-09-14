# Current work

**Status:** idle — nothing in flight.

Last finished: **fix #14** — `next` 16.3.5 and `sharp` 0.35.4, leaving the versions named
in the 2026-09-08 advisories, and `js-yaml` 4.3.2. `npm audit` now reports only the four
development-only findings assessed in #14 (`drizzle-kit`/`esbuild`, `exceljs`/`uuid`).

Next up: a patch release, 1.4.2, so instances following `latest` or `1.4` leave the
advised versions too.

Notes for whoever comes next:

- The README's tests badge is still a static number.
- Not yet tried against a live Authentik, only against `oidc-provider`.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first.

See `docs/WORKFLOW.md` for how this file is used.
