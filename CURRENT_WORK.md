# Current work

# Current work

**Status:** idle — nothing in flight.

# Current work

# Current work

# Current work

**Feature:** F14 – Onboarding wizard and empty states
**Status:** in progress
**Started:** 2026-08-21

## Goal

A fresh household gets a guided German setup flow and contextual next actions instead of
dead-end empty screens.

## Scope

- In: first-run onboarding, atomic member/income setup, redirect guards, and contextual
  empty-state actions across the main planning screens.
- Out: mobile polish and accessibility audit beyond the onboarding flow.

## Plan

- [x] Add the authenticated onboarding route and redirect guard.
- [x] Persist initial members and optional incomes atomically.
- [x] Improve contextual empty states and German copy.
- [ ] Run the full check, reset this file, commit, and push.

## Notes / decisions

- Onboarding is session-protected and completion is persisted on the singleton household.
- Existing member and income validation conventions are reused.

## Resume here

Run the full check, verify the 375 px onboarding layout, then reset this file and commit
the finished feature.
