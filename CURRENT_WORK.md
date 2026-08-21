# Current work

**Feature:** F08 – Private fixed costs
**Status:** in progress
**Started:** 2026-08-21

## Goal

The first two of the spreadsheet's three blocks: what each person pays on their own,
every month, with a category and a rhythm. After this the app already holds more than
"Jan · privat" and "Jana · privat" did, because a yearly charge no longer has to be
divided by hand.

## Scope

- In: the expense service for private costs, a form with label, amount, rhythm and
  category, per-person cards with a monthly total, remove with undo, and the household
  total for private fixed costs.
- Out: shared costs and the per-item split mode — that is F09, and it is the reason the
  service is written to handle both scopes from the start.

## Plan

- [ ] `server/services/expenses.ts` with tests: list private grouped by member,
      create, update, retire, restore
- [ ] `lib/validation/expense.ts`
- [ ] `/fixkosten`: a card per person, rows with category icon, label, amount
- [ ] Expense dialog reusing the money input and the category list
- [ ] German copy
- [ ] Verified by screenshot at 375 px and desktop
- [ ] `npm run check` passes

## Notes / decisions

- The service handles both scopes now, even though only the private one has a screen.
  Splitting it in two would mean two code paths for the same totals, and F09 would have
  to merge them again.
- The category is optional. Someone entering their first three costs should not have to
  answer a taxonomy question before the app is useful to them.
- `due_month` stays out of the form. The column exists for a later cash-flow view; asking
  for it now would be a question with no visible payoff.

## Resume here

If interrupted: `npm run test` covers the service; the UI is unfinished if `/fixkosten`
still shows the placeholder empty state.
