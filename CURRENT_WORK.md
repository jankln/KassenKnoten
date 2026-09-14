# Current work

**Feature:** CI runs `npm run check`, and no image is built without it
**Status:** in progress
**Started:** 2026-09-14

## Goal

Every push to `main` and every pull request runs typecheck, lint, format check and the
full test suite on GitHub, and an image — `edge` or a release tag — is only built when
that passed. Today the suite runs only on the machine that commits, so nothing stops a
commit or a tag that skipped it.

## Scope

- In: `.github/workflows/check.yml`, a reusable workflow that runs on pull requests and is
  called from `image.yml`; `image.yml`'s build waits for it.
- In: Node 22, the version the image runs, so the suite passes on the runtime that ships.
- In: `docs/WORKFLOW.md` and `docs/PLAN.md` §8 say what CI enforces.
- Out: Playwright (next item), a live status badge.

## Plan

- [ ] `check.yml`: checkout, setup-node 22 with npm cache, `npm ci`, `npm run check`
- [ ] `image.yml`: a `check` job calling it, `build` needs it
- [ ] docs
- [ ] push and watch: check runs first, build starts only after it

## Notes / decisions

- One workflow file for the checks rather than a copy in each trigger: `image.yml` calls it
  with `workflow_call`, pull requests trigger it directly. Two copies of the steps would be
  two definitions of "green" that can drift.

## Resume here

Write `check.yml`, then add the `needs` in `image.yml`.
