# Current work

**Feature:** F31 – automatic backups
**Status:** in progress
**Started:** 2026-09-14

## Goal

The household's data is backed up without anybody remembering to press a button: once a
day the server writes the same versioned JSON the settings screen downloads, keeps the
last fourteen distinct states on the data volume, and shows them in the settings to
download — ready for the existing restore.

## Scope

- In: `server/backups/automatic.ts` — due check, write (atomic, owner-only), skip when
  nothing changed, prune to `BACKUP_KEEP`; tested against a temporary directory.
- In: `instrumentation.ts` starts an hourly check in the Node.js server; not during the
  build, not twice under hot reload.
- In: `BACKUP_DIR` (default: `backups/` beside the database, `/data/backups` in the
  image) and `BACKUP_KEEP` (default 14, `0` switches it off), validated in `lib/env.ts`.
- In: Settings → Back up your data: last automatic backup, the kept files, a download for
  each through an authenticated route that only serves names it wrote itself.
- In: `.env.example`, README, `docs/PLAN.md`.
- Out: copying backups off the machine. The volume is one disk; the README says so and
  says what to copy.
- Out: restoring straight from the list — download, then the existing restore, which
  already asks for confirmation.

## Plan

- [ ] env: `BACKUP_DIR`, `BACKUP_KEEP`
- [ ] `server/backups/automatic.ts` + tests
- [ ] `instrumentation.ts`
- [ ] download route `app/api/backup/automatic/[name]/route.ts`
- [ ] settings card, copy in `en.ts` and `de.ts`
- [ ] docs
- [ ] `npm run check`; standalone server writes a backup on start, skips an unchanged one,
      prunes, and the settings list downloads it; 375 px; `npm run test:e2e`

## Notes / decisions

- JSON, not a copy of the SQLite file: it is what the restore screen reads, it is readable
  without tools, and since #15 it carries household data only.
- A timer in the server rather than on the first request of the day, like snapshots: a
  change made in the evening should be in a backup before the disk that holds it fails,
  not the next time somebody happens to open the app.
- Identical content is not written again, so fourteen kept files are fourteen states, not
  fourteen copies of a quiet fortnight.

## Resume here

Start with the env variables, then `server/backups/automatic.ts` and its tests.
