# Current work

**Feature:** The fixed-costs totals count the current month only
**Status:** in progress
**Started:** 2026-08-25

## Goal

The fixed-costs screen adds up what the household actually pays this month. A cost that
ended in June, or a rent increase that starts in October, is still listed with its
validity note, but it no longer sits inside the per-person total, the private and shared
subtotals, or the grand total at the bottom.

## Scope

- In: `listPrivateExpenses` and `listSharedExpenses` learn the period they describe, the
  way `listMembersWithIncome` did in fix #1 and `listVariableCosts` always has.
- In: every row says whether it counts in that month, so the page can total without
  repeating the rule and a row that does not count can be told apart from one that does.
- Out: the shape of what those two functions return. Extensions are handed
  `api.services.expenses` under `apiVersion: 1`; a new field on a row is additive, a new
  return type would break somebody's card. The `period` argument goes last and defaults.

## Plan

- [ ] `appliesInPeriod` on `ExpenseRow`, totals filtered in the service
- [ ] The page's private, shared and grand totals skip rows outside the month
- [ ] Tests: an ended cost and one that has not started are listed but not counted
- [ ] `npm run check`, and the screen at 375 px

## Notes / decisions

- This is the same flaw fix #1 corrected for income, on the other screen. The dashboard
  was right all along; it queries by period in SQL. What drifted is the screens that read
  every active row and add it up.

## Resume here

`server/services/expenses.ts`.
