# Current work

**Feature:** Release 1.4.0
**Status:** in progress
**Started:** 2026-09-14

## Goal

Get the trend readout (F30), optional sign-in with an identity provider (F04b) and fixes
#4 to #9 onto a tag. All of it is on `main` and therefore only in `:edge`; anyone following
`latest` or `1.3` has none of it.

## Scope

- In: version in `package.json`, the pinned tag in `docker-compose.yml`, the release and
  tests badges and the Status section in `README.md`, the `v1.4.0` tag, the GitHub release
  with `docker-compose.yml` and `env.example` attached.
- Out: any change to behaviour. Minor, not patch, because F04b adds optional environment
  variables and F30 a new way to read the dashboard; nothing existing breaks.

## Plan

- [ ] Image build of the last fix commit green.
- [ ] `npm version 1.4.0 --no-git-tag-version`, compose pin, README badges and Status.
- [ ] `npm run check`, commit `chore(release): 1.4.0`, push.
- [ ] Tag `v1.4.0`, push, confirm `1.4.0`, `1.4` and `latest` land on one manifest.
- [ ] GitHub release with notes and both assets.

## Notes / decisions

- Upgrading from 1.3.1 is a pull and a restart: no schema migration (the sign-in choices
  use the existing `app_setting` table), and an existing `.env` with `AUTH_MODE=local`
  keeps working unchanged. The new `OIDC_*` variables are all optional.
- The release notes must say where the new `.env` lines come from, since an upgraded
  instance keeps its old `.env` without the OIDC block.

## Resume here

Wait for the image build, then `npm version 1.4.0 --no-git-tag-version`.
