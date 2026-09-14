# Current work

**Status:** idle — nothing in flight.

Last finished: **CI runs `npm run check`.** `check.yml` runs on pull requests and is
called by `image.yml`, whose build now waits for it, so no image is built from a commit
that fails typecheck, lint, format or tests. Verified locally beforehand on a fresh clone
under Node 22: 393 tests in 24 seconds.

Next up (agreed 2026-09-14): a Playwright smoke test of the critical path, `docs/PLAN.md`
§8, against the standalone build.

Notes for whoever comes next:

- The README's tests badge is still a static number; a live workflow badge would replace
  it.
- Not yet tried against a live Authentik, only against `oidc-provider`.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first.

See `docs/WORKFLOW.md` for how this file is used.
