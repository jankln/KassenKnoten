# Current work

**Feature:** Fix #2 – Release 1.2.0, so the published image has the extensions screen
**Status:** in progress
**Started:** 2026-08-25

## Goal

Somebody who pulls `ghcr.io/jankln/kassenknoten:latest` gets the settings screen that has
Extensions on it, and an interface that speaks their language.

## Scope

- In: the version bump — `package.json`, the pinned tag in `docker-compose.yml`, the
  badge and the status line in the README.
- In: tag `v1.2.0` so the image workflow republishes `latest` for both architectures, and
  a GitHub release carrying `docker-compose.yml` and `env.example`, because the documented
  curl reads them from `releases/latest/download`.
- Out: anything new. This release is what is already on `main`.

## Notes / decisions

- Nothing was wrong with the extensions code. `latest` follows tags only (see
  `.github/workflows/image.yml`), and F26–F28 landed after `v1.1.0`, so the image everyone
  is running is a month of work behind `main`. The fix for the report is a release.
- Minor, not patch: extensions and a second interface language are features.

## Plan

- [ ] Bump 1.1.0 → 1.2.0 in package.json, docker-compose.yml, README
- [ ] `npm run check`
- [ ] Tag and push `v1.2.0`, watch the image workflow
- [ ] Publish the release with both assets, verify the pull from a clean directory

## Resume here

If the tag is pushed but the release is missing, the curl in the README still serves the
1.1.0 assets. Finish by creating the release.
