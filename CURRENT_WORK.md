# Current work

**Feature:** Playwright smoke test of the critical path, against the standalone build
**Status:** in progress
**Started:** 2026-09-14

## Goal

One end-to-end test walks the path the product exists for — sign in, set up the example
household, add a shared cost split by income, and see the right shares on the overview —
in a real browser at 375 px, against the same standalone server the image runs. CI runs it
before any image is built. `docs/PLAN.md` §8 has promised this since Milestone C.

## Scope

- In: `@playwright/test`, `playwright.config.ts`, `e2e/smoke.spec.ts`.
- In: `scripts/e2e-server.mjs` — starts `.next/standalone` with a throwaway database, a
  known test password and a fresh session secret, the way the container starts.
- In: an `e2e` job in `check.yml` (build, install Chromium, run), so `image.yml` waits for
  it too; `npm run test:e2e`.
- In: the example household, Alex 2050 € and Robin 2310 €, shared rent 1182,35 € by income:
  555,92 € and 626,43 € — computed by hand, not by the app's own split function, so the
  test cannot agree with a bug.
- Out: more journeys, desktop viewport, visual comparison. One path, done properly.

## Plan

- [ ] install `@playwright/test`, config with one Chromium project at 375 × 812
- [ ] `scripts/e2e-server.mjs`
- [ ] `e2e/smoke.spec.ts`: login → wizard → shared cost → overview, plus no horizontal
      overflow on each screen
- [ ] `npm run test:e2e` locally against a fresh build
- [ ] `e2e` job in `check.yml`; watch it run, and the image build wait for it
- [ ] docs: `docs/PLAN.md` §8, `docs/WORKFLOW.md`

## Notes / decisions

- The split by income of 118235 cents at 2050:2310 — Alex 55592.14…, Robin 62642.85… —
  leaves one cent, which the largest-remainder method gives to Robin: 555,92 € and
  626,43 €.

## Resume here

Install `@playwright/test`, then write the server script.
