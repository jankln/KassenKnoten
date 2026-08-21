# Current work

**Feature:** F02 – Database layer
**Status:** in progress
**Started:** 2026-08-21

## Goal

Give the app a real, migrated SQLite database: every table from `docs/PLAN.md` section 4
exists as a typed Drizzle schema, migrations run automatically on startup, and the system
categories are seeded. No UI touches it yet — F06 onwards will.

## Scope

- In: Drizzle schema, generated SQL migrations, SQLite connection with the right pragmas,
  automatic migration on boot, system category seed, integration test against a temporary
  database file.
- Out: services, queries used by screens, domain calculations (F03), any UI.

## Plan

- [ ] `db/schema.ts` with household, member, income, category, expense, expense_share,
      savings_pot, snapshot, snapshot_member, app_setting
- [ ] `drizzle.config.ts` + generate the initial migration
- [ ] `db/client.ts`: lazy singleton, `foreign_keys=ON`, WAL, busy timeout, auto-migrate
- [ ] `db/seed.ts`: system categories and the singleton household row
- [ ] `db/schema.test.ts`: migrate a temp DB, insert, read back, prove FK/cascade behaviour
- [ ] `better-sqlite3` marked as a server-external package for Next
- [ ] `npm run check` passes

## Notes / decisions

- Intervals are stored as a single `interval_months` integer (1, 3, 6, 12, n) instead of an
  enum plus a number. The label ("monatlich", "jährlich", "alle 4 Monate") is derived in the
  UI, so there is no redundant state that can disagree with itself.
- Money columns are `integer` cents, shares are `integer` basis points — enforced by CHECK
  constraints where SQLite allows it.
- Deletions are soft (`active = 0`); snapshots therefore always resolve real member names.
- `better-sqlite3` over `node:sqlite` because Drizzle has no `node:sqlite` driver in 0.45.

## Resume here

If interrupted: run `npx drizzle-kit generate` to see whether the migration matches the
schema, then `npm run test`.
