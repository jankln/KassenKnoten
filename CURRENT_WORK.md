# Current work

**Feature:** F19 – Effective-dated incomes and fixed costs, month navigation
**Status:** in progress
**Started:** 2026-08-22

## Goal

Every income and fixed cost carries the months it is valid for, and the dashboard can be
stepped through month by month. Giving someone a raise in March stops rewriting January:
each month is computed from what was actually valid then.

## Scope

- In: a `valid_from` / `valid_until` period pair on `income` and `expense`, a pure period
  module, period-aware services, month navigation on the dashboard, the two date fields
  in every income and fixed-cost dialog, a computed trend, backup format v2.
- Out: savings pots. A pot has a balance, which is a value as of now, not something that
  is valid for a range. Their history stays with the snapshots.

## Decisions (agreed before implementation)

1. **Editing splits the record.** Saving an existing entry with a later `valid_from`
   closes the old row at the preceding month and inserts a new one. Leaving the date
   untouched corrects the existing row, which is what a typo needs.
2. **The past is computed, not frozen.** Every month is derived from the effective-dated
   rows, so a correction entered late also fixes the months it belongs to. Snapshots stay
   only for savings balances, which nothing else records.

## Plan

- [ ] `lib/domain/period.ts`: the period type and its arithmetic, moved out of
      `snapshots.ts` and unit-tested
- [ ] Migration: the two columns, their constraints, and a backfill that keeps existing
      entries visible in the months they were already showing up in
- [ ] Services read a period; `updateIncome` / `updateExpense` split on a later date
- [ ] Dashboard: month navigation, and a computed trend replacing the snapshot one
- [ ] Dialogs: "Gültig ab" and "Gültig bis", German copy, 375 px
- [ ] Backup v2, reading v1 by backfilling
- [ ] `npm run check`, and verify a raise leaves the previous month alone

## Notes / decisions

- `lib/domain/` stays pure: the period arithmetic and the "is this row valid in month M"
  predicate are domain functions, but the filtering happens in the service layer before
  `summariseHousehold` is called. The summary function itself never learns about time.
- The backfill sets `valid_from` to the earliest month the household has any evidence of
  (its own creation month, or an older snapshot period). Backfilling to a placeholder
  like 1970-01 would put a nonsense date in front of the user in every dialog.
- `<input type="month">` rather than a custom picker: it is the one control that gives a
  period directly and brings its own mobile keyboard.

## Resume here

Start with `lib/domain/period.ts` and its tests. Everything else depends on that
vocabulary, and it is the piece where an off-by-one month is cheapest to catch.
