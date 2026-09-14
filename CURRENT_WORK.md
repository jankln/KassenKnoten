# Current work

**Feature:** Fix #15 – a restore leaves sign-in settings and extension switches alone
**Status:** in progress
**Started:** 2026-09-14

## Goal

Restoring a backup brings back the household's data and nothing else: which sign-in
methods are on, who is on the allowlist and which extensions run stay as the instance has
them.

## Scope

- In: `server/services/backup.ts` — instance keys (`auth.*`, `extensions.enabled`) are left
  out of new exports and kept across a restore; a file that still carries them has those
  rows ignored.
- In: tests for both directions.
- Out: automatic backups — next, and they depend on this.

## Plan

- [ ] failing tests: export omits instance keys; restore keeps current values even when the
      file has other ones or none
- [ ] one list of instance keys, next to the modules that own them
- [ ] `npm run check`

## Resume here

Tests first in `server/services/backup.test.ts`.
