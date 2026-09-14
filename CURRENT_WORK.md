# Current work

**Feature:** Release 1.6.0
**Status:** in progress
**Started:** 2026-09-14

## Goal

Get the settings in categories (F32) onto a tag. It is on `main` and therefore only in
`:edge`.

## Scope

- In: version in `package.json`, the pinned tag in `docker-compose.yml`, the release and
  tests badges, the test count and the Status section in `README.md`, the `v1.6.0` tag,
  the GitHub release with both assets.
- Out: any change to behaviour. Minor, not patch: the settings have new pages and
  addresses. No migration, no new environment variable.

## Plan

- [x] Image build of the feature commit green.
- [ ] `npm version 1.6.0 --no-git-tag-version`, compose pin, README.
- [ ] commit `chore(release): 1.6.0`, push, build green.
- [ ] Tag `v1.6.0`, confirm `1.6.0`, `1.6` and `latest` on one manifest.
- [ ] GitHub release with notes and both assets.

## Resume here

`npm version 1.6.0 --no-git-tag-version`.
