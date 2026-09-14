# Current work

**Feature:** Fix #9 – shared cost placeholder comes from the message files
**Status:** in progress
**Started:** 2026-09-14

## Goal

The label field in the shared fixed cost dialog shows "e.g. Rent" on an English instance
and "z. B. Miete" on a German one.

## Scope

- In: `sharedLabelPlaceholder` in both message files, used by the dialog.
- Out: other dialog copy.

## Plan

- [ ] copy in `en.ts` and `de.ts`
- [ ] `shared-dialog.tsx` uses it
- [ ] `npm run check`, then open the dialog in both languages

## Resume here

One string, two files, one attribute.
