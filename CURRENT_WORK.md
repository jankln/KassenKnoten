# Current work

**Feature:** Fix – the receipt scanner is invisible to a household that has no items yet
**Status:** in progress
**Started:** 2026-08-27

## Goal

A fresh household can find out that scanning exists, and the launcher shortcut stops
promising something the screen it opens does not offer.

## The defect

F29 gates the scan button on there being at least one variable-cost item in the month on
screen, which is correct — a receipt is booked against an item, and without one there is
nothing to book it onto. Two things were not thought through:

1. **The shortcut leads nowhere.** `app/manifest.ts` offers "Scan receipt" unconditionally.
   Long-press the installed icon, pick it, and a household with no items lands on the
   ordinary empty state: no scanner, and not a word about why. A shortcut that promises
   what the target screen does not have.
2. **A new household never learns the feature exists.** The empty state teaches items and
   the two modes and says nothing about scanning — so the feature is invisible to exactly
   the person who has not yet built the habit of typing receipts in by hand.

Found the honest way: the feature was released, opened, and was not there.

## Scope

- In: an empty state that answers the question actually asked when somebody arrives via
  the shortcut, and a sentence in the ordinary empty state naming the scanner. Copy in
  both languages.
- Out: showing a scan button that cannot scan, and letting the scan flow create an item
  on the fly. The second was considered and rejected again: the item carries the split,
  so an item created in passing would be deciding who pays what in passing.

## Plan

- [ ] `receipt.needsItemTitle` / `receipt.needsItem` in `en.ts` and `de.ts`, and one
      sentence added to `variableCosts.empty.body`.
- [ ] `page.tsx`: when `?scan=1` arrives and the month has no items, the empty state
      answers that question instead of the generic one. Keyed on the scan targets, not on
      the segment — the shared segment can be empty while scanning is perfectly possible.
- [ ] Check it at 375 px in both states, `npm run check`, commit, push.

## Notes / decisions

- `data/kassenknoten.db` on the dev server is test data, not a real household, so it can
  be used for this.

## Resume here

`app/(app)/variable-kosten/page.tsx`, the two `EmptyState` branches.

See `docs/WORKFLOW.md` for how this file is used.
