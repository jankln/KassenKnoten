# Current work

**Feature:** Release 1.3.0
**Status:** in progress
**Started:** 2026-08-27

## Goal

Publish the receipt scanner as a release, so the tag a running instance follows actually
carries it. `main` only publishes `:edge`; `latest`, `{{version}}` and `{{major}}.{{minor}}`
are cut by pushing `v*`. Until that tag exists, F29 is written but not shipped.

## Scope

- In: version in `package.json`, the pinned tag in `docker-compose.yml`, the release
  badge and the Status section in `README.md`, the `v1.3.0` tag, the GitHub release.
- Out: any change to what the software does, and any change to how the image is tagged.

## Plan

- [ ] Wait for the image build of the F29 commit to go green — a release cut on a red
      build is a tag that pulls nothing.
- [ ] `npm version 1.3.0 --no-git-tag-version`, compose pin, README badge and Status.
- [ ] `npm run check`, commit `chore(release): 1.3.0`, push.
- [ ] Tag `v1.3.0`, push the tag, watch the workflow publish `1.3.0`, `1.3` and `latest`.
- [ ] GitHub release with notes.

## Notes / decisions

- The compose file in this repository keeps pinning an exact version. It is what a
  stranger runs on first contact, and a moving tag there would mean their instance
  changes underneath them without them asking. Following a moving tag is a decision the
  person running the instance makes in their own compose file, not one this repository
  makes for them.

## Resume here

Check `gh run list`. If the F29 build is green, bump and tag; if it failed, fix that
first — nothing about a release is urgent enough to publish a broken image.

See `docs/WORKFLOW.md` for how this file is used.
