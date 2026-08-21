# Current work

**Feature:** F06 – Household and members
**Status:** in progress
**Started:** 2026-08-21

## Goal

The first screen that holds real data: add the people in the household, give each a
colour, and record their income sources. After this the app knows who earns what, which
is the input every later calculation needs.

## Scope

- In: member CRUD (add, rename, recolour, retire with undo), income sources per member
  (label, amount, interval), the monthly total per person and for the household, a money
  input that parses German amounts, and a dialog pattern reused by both forms.
- Out: the household default split quota (a setting, F09), categories (F07), anything
  about expenses.

## Plan

- [ ] `app/(app)/layout.tsx` calls `requireSession()` — a second gate behind the proxy,
      and it is what makes these pages dynamic instead of prerendered at build time
- [ ] `server/services/members.ts`: read members with income, create, update, retire,
      restore; income create, update, remove
- [ ] `lib/validation/member.ts`: zod schemas shared by the forms and the actions
- [ ] `components/ui/{dialog,field,input,select}.tsx` and a `MoneyInput` that parses
      German amounts and shows the parsed value back
- [ ] `app/(app)/haushalt`: member cards with income rows, add and edit dialogs,
      retire with an undo toast
- [ ] German copy for all of it in `lib/i18n/de.ts`
- [ ] Service tests against a temporary database
- [ ] Verified by screenshot at 375 px and desktop, light and dark
- [ ] `npm run check` passes

## Notes / decisions

- Retiring a person sets `active = 0` rather than deleting: snapshots and past months must
  keep resolving to a real name, and an accidental tap has to be undoable.
- Income rows are edited in a dialog rather than inline. Inline editing reads well on a
  desktop table and badly on a 375 px card, and one pattern beats two.
- Mutations end with `refresh()` from `next/cache`, the Next 16 way to re-render the
  current route from a Server Action.

## Resume here

If interrupted: `npm run test` covers the service layer; the UI is unfinished if
`/haushalt` still shows the empty state with no way to add anyone.
