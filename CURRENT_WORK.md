# Current work

**Feature:** F18 – Public README, product description, first beta release
**Status:** in progress
**Started:** 2026-08-22

## Goal

The README stops being an internal project log and starts being the front door: someone
who has never heard of this understands in fifteen seconds what it does, sees it, and
knows how to run it. The project ships its first tagged beta.

## Scope

- In: README rewritten as a product page, screenshots, `package.json` description and
  version, the GitHub repository description, an annotated `v1.0.0-beta.1` tag and
  release.
- Out: making the repository public. That publishes the whole history irreversibly, so
  it is the maintainer's call, not a side effect of a documentation commit.

## Plan

- [ ] Seed the running container with the documented example household and capture
      screenshots from it
- [ ] Rewrite README: what it does, why it exists, how to run it — no workflow, no
      spreadsheet origin story
- [ ] `package.json`: description and version `1.0.0-beta.1`
- [ ] GitHub repository description
- [ ] Tag and release

## Notes / decisions

- Screenshots come from the Docker container, whose database is empty, seeded with the
  Alex/Robin example household from `docs/WORKFLOW.md`. Screenshotting the development
  instance would risk putting real figures into a repository that may go public.
- Version `1.0.0-beta.1`: everything the plan scoped for v1 works, and the beta label
  carries the one gap that remains, OIDC.
- The README stays English. The product is German, the documentation is not — see the
  language rule in `AGENTS.md`.

## Resume here

The history was checked before any of this: no `.xlsx`, `.db` or `.env` has ever been
committed, and the only figures in the documentation are the fictional example
household. Publishing is safe from a data standpoint.
