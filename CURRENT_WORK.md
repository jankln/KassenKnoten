# Current work

**Feature:** Release 1.4.2
**Status:** in progress
**Started:** 2026-09-14

## Goal

Instances following `latest` or `1.4` leave Next.js 16.3.2 and sharp 0.35.3, the versions
named in the 2026-09-08 security advisories (#14). `main` has the update; only `edge`
carries it.

## Scope

- In: version in `package.json`, the pinned tag in `docker-compose.yml`, the release badge
  and Status version in `README.md`, the `v1.4.2` tag, the GitHub release with both assets.
- Out: anything else. A patch: no schema change, no new environment variable.

## Plan

- [x] Image build of the fix commit green, with checks and the smoke test.
- [ ] `npm version 1.4.2 --no-git-tag-version`, compose pin, README.
- [ ] commit `chore(release): 1.4.2`, push, build green.
- [ ] Tag `v1.4.2`, confirm `1.4.2`, `1.4` and `latest` on one manifest.
- [ ] GitHub release with notes and both assets.

## Resume here

`npm version 1.4.2 --no-git-tag-version`.
