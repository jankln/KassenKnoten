# Current work

**Feature:** F03 – Domain engine
**Status:** in progress
**Started:** 2026-08-21

## Goal

The pure calculation core the whole app leans on: turn incomes, fixed costs and savings
pots into monthly figures, split shared costs between members without ever losing a cent,
and produce the household summary the Excel sheet used to compute with formulas.

## Scope

- In: `lib/domain/{money,interval,split,summary}.ts` plus exhaustive unit tests.
  No database, no framework, no ambient clock — plain objects in, plain objects out.
- Out: services reading from the database (F06+), formatting for the UI (F05),
  snapshot persistence (F13).

## Plan

- [ ] `money.ts`: cent arithmetic and `allocate()` — largest-remainder distribution
- [ ] `interval.ts`: normalise any interval to a monthly amount, and back
- [ ] `split.ts`: resolve a shared expense into per-member cents for both split modes
- [ ] `summary.ts`: household totals and the per-member breakdown
- [ ] Tests including the real numbers from the spreadsheet, so the app provably
      reproduces what the household is used to seeing
- [ ] `npm run check` passes

## Notes / decisions

- **Largest remainder** for every split: floor each share, then hand the leftover cents to
  the largest fractional parts. Guarantees the shares sum back to the exact total, which
  naive rounding does not.
- A monthly figure derived from a non-monthly interval is rounded to the cent per item,
  and totals sum those rounded values — so the displayed rows always add up to the
  displayed total. Nothing invisible happens between the rows and the sum.
- Degenerate inputs get defined behaviour rather than a crash: zero total income falls
  back to an equal split, a single member takes everything, weights of zero share equally.

## Resume here

If interrupted: `npm run test` shows which part of the engine is unfinished.
