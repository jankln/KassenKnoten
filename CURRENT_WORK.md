# Current work

**Feature:** Release 1.4.1
**Status:** in progress
**Started:** 2026-09-14

## Goal

Get the receipt scanner working on deployed instances. Every release since 1.3.0 ships an
image whose recognition worker cannot start (#10), and the scan then hangs (#11); `main`
fixes both, reads shadowed photos far better (#12) and cleans up the merchant name (#13),
but only `edge` carries it.

## Scope

- In: version in `package.json`, the pinned tag in `docker-compose.yml`, the release and
  tests badges and the test count in `README.md`, the `v1.4.1` tag, the GitHub release
  with `docker-compose.yml` and `env.example` attached.
- Out: anything else. A patch: no schema change, no new environment variable.

## Plan

- [x] Image builds of the fix commits green, including the new build check.
- [ ] `npm version 1.4.1 --no-git-tag-version`, compose pin, README.
- [ ] `npm run check`, commit `chore(release): 1.4.1`, push, build green.
- [ ] Tag `v1.4.1`, push, confirm `1.4.1`, `1.4` and `latest` land on one manifest.
- [ ] GitHub release with notes and both assets.

## Notes / decisions

- The notes must say plainly that scanning did not work in any image before this one, and
  that a scan now holds about 35 MB more memory while a worker is alive.

## Resume here

`npm version 1.4.1 --no-git-tag-version`, then the README and the compose pin.
