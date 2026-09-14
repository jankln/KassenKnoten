# Current work

**Status:** idle — nothing in flight.

Last finished: **Playwright smoke test of the critical path.** `e2e/smoke.spec.ts` signs
in, sets up Alex and Robin, adds a shared rent split by income and reads 555,92 € and
626,43 € on the overview — at 375 px, against the standalone build on a throwaway
database. It runs in CI next to `npm run check`, and `image.yml` waits for both. Shown to
fail when an expected share is one cent off.

Nothing open on `docs/PLAN.md`.

Notes for whoever comes next:

- `npm audit` reports 9 vulnerabilities (1 critical, 2 high), from existing dependencies
  such as `exceljs` — not from Playwright. Not looked into yet.
- The README's tests badge is still a static number.
- Not yet tried against a live Authentik, only against `oidc-provider`.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first.

See `docs/WORKFLOW.md` for how this file is used.
