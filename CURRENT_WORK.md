# Current work

**Feature:** F09 – Shared fixed costs and their split
**Status:** in progress
**Started:** 2026-08-21

## Goal

The third block of the spreadsheet, and the one requirement it could not meet: every
shared cost carries **its own** split. The household default only pre-fills the form —
the decision is made per item and recorded per item.

## Scope

- In: shared expenses with a required split mode (fixed quota or by income), per-member
  shares stored per expense, a live preview of what each person pays while the form is
  open, the Privat/Gemeinsam segmentation on `/fixkosten`, the combined fixed-cost total,
  and the household's default split as a setting.
- Out: the dashboard that uses all of this (F12).

## Plan

- [ ] Service: list shared expenses with resolved shares, create, update; read and write
      the household default split
- [ ] `lib/validation/expense.ts`: shared schema, shares must add up to 100 %
- [ ] `SplitEditor`: mode choice plus quota inputs, with a live euro preview computed by
      the same domain function the server uses
- [ ] `/fixkosten`: segmented into Privat and Gemeinsam, with the combined total
- [ ] Settings: default split mode and default quota
- [ ] Service tests, including that stored shares survive a change to the default
- [ ] Verified by screenshot at 375 px and desktop
- [ ] `npm run check` passes

## Notes / decisions

- A fixed quota is **always** written to `expense_share`, even when it matches the
  household default. Otherwise changing the default later would silently re-split every
  past expense — the opposite of "decided per item".
- The preview uses `splitExpense()` from `lib/domain`, the same pure function the server
  uses to compute the real thing. A preview computed a second way is a preview that can
  lie.
- Income-based splitting shows the resulting percentages, because "nach Einkommen" means
  nothing until you see that it is 47/53 rather than 50/50.

## Resume here

If interrupted: `npm run test` covers the service; the UI is unfinished if `/fixkosten`
has no Gemeinsam segment.
