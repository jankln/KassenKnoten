# Current work

**Feature:** Fix #1 – The income total counts the current month only
**Status:** in progress
**Started:** 2026-08-25

## Goal

The household screen shows what the household earns *this month*. An income that only
starts in September, or one that ended in June, is still listed with its validity note,
but it no longer inflates the figure next to a person's name or the total underneath.

## Scope

- In: `listMembersWithIncome` takes the period it describes and sums only the incomes
  that cover it, the way `getDashboardData` already does. The label says which month.
- In: everything downstream of `monthlyIncomeCents` — the income-ratio split preview on
  fixed, variable and savings — inherits the same rule, because a raise that has not
  happened yet must not shift today's split either.
- Out: fixed costs. `listPrivateExpenses` sums every row the same way and has the same
  flaw, but it is a separate screen and a separate commit.

## Plan

- [ ] `listMembersWithIncome(db, period)` filters with `coversPeriod`
- [ ] Tests: a future income and an ended one are listed but not counted
- [ ] Copy in both languages says the total is this month's
- [ ] `npm run check`

## Notes / decisions

- The rows themselves stay complete. Hiding a future raise would make the screen where
  you enter it the screen that will not show it back to you.

## Resume here

`server/services/members.ts`.
