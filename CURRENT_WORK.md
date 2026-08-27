# Current work

**Feature:** Release 1.3.1
**Status:** in progress
**Started:** 2026-08-27

## Goal

Get the findability fix onto a tag. 1.3.0 shipped a scanner that a household with no
items could not discover and a launcher shortcut that landed on an empty state saying
nothing about scanning; that is fixed on `main` and therefore only in `:edge`. Anyone
following `latest` or `1.3` still has the version that hides the feature.

## Scope

- In: version in `package.json`, the pinned tag in `docker-compose.yml`, the release
  badge and the Status section in `README.md`, the `v1.3.1` tag, the GitHub release.
- Out: anything else. This is a patch: no schema change, no new environment variable,
  no change to what the scanner does once it is on screen.

## Plan

- [x] Image build of the fix commit green.
- [ ] `npm version 1.3.1 --no-git-tag-version`, compose pin, README badge and Status.
- [ ] `npm run check`, commit `chore(release): 1.3.1`, push.
- [ ] Tag `v1.3.1`, push, confirm `1.3.1`, `1.3` and `latest` land on one manifest.
- [ ] GitHub release with notes.

## Notes / decisions

- The Status paragraph in the README moves from "1.3.0 adds the receipt scanner" to
  "1.3 adds …", so a patch release does not have to restate a feature that did not
  change with it.

## Resume here

`npm version 1.3.1 --no-git-tag-version`, then the three files.

See `docs/WORKFLOW.md` for how this file is used.
