# Current work

**Feature:** Release 1.5.0
**Status:** in progress
**Started:** 2026-09-14

## Goal

Get automatic backups (F31) and the restore fix for instance settings (#15) onto a tag.
Both are on `main` and therefore only in `:edge`.

## Scope

- In: version in `package.json`, the pinned tag in `docker-compose.yml`, the release and
  tests badges, the test count and the Status section in `README.md`, the `v1.5.0` tag,
  the GitHub release with both assets.
- Out: any change to behaviour. Minor, not patch: F31 adds optional environment variables
  and writes into the data volume. No migration; the backup format version is unchanged.

## Plan

- [x] Image build of the feature commit green, with checks, smoke test and trace guard.
- [ ] `npm version 1.5.0 --no-git-tag-version`, compose pin, README.
- [ ] commit `chore(release): 1.5.0`, push, build green.
- [ ] Tag `v1.5.0`, confirm `1.5.0`, `1.5` and `latest` on one manifest.
- [ ] GitHub release with notes and both assets.

## Notes / decisions

- The notes must say that upgraded instances start writing into `/data/backups` on their
  own, how to switch that off, and that the backups share the disk with the data.

## Resume here

`npm version 1.5.0 --no-git-tag-version`.
