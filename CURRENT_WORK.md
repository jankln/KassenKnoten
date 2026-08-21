# Current work

**Feature:** F10 – Savings pots
**Status:** in progress
**Started:** 2026-08-21

## Goal

Households can create and maintain savings pots with a monthly rate, current balance,
optional target, owner and note, and see each pot's progress in the German savings view.

## Scope

- In: savings-pot CRUD, monthly rate and balance handling, optional targets, ownership,
  progress display, soft delete with undo, and validation.
- Out: monthly snapshots, dashboard integration, Excel import, and bank synchronization.

## Plan

- [ ] Add the savings-pot service and server actions with validation.
- [ ] Build the responsive savings-pot list and create/edit dialog.
- [ ] Add domain/service tests and update the roadmap and copy.
- [ ] Run the full check, reset this file, commit, and push.

## Notes / decisions

- Reuse the existing `savings_pot` schema and integer-cent conventions.
- Targets are optional; progress is capped visually at 100% while over-target pots are
  called out explicitly.

## Resume here

Inspect the existing service/action and dialog patterns, then implement F10 end to end.
