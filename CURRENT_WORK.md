# Current work

# Current work

**Status:** idle — nothing in flight.

# Current work

# Current work

# Current work

# Current work

**Status:** idle — nothing in flight.

**Feature:** F14 follow-up – Multiple incomes during onboarding
**Status:** in progress
**Started:** 2026-08-21

## Goal

Each person added during first-run setup can have multiple income sources instead of
being limited to one entry.

## Scope

- In: repeatable income fields per person in the onboarding wizard, validation, atomic
  persistence, and tests.
- Out: changes to the existing post-onboarding income CRUD.

## Plan

- [ ] Change onboarding input and service to accept multiple incomes per member.
- [ ] Add repeatable income rows to the German onboarding form.
- [ ] Test validation, persistence, and the 375 px layout.
- [ ] Run the full check, reset this file, commit, and push.

## Notes / decisions

- Reuse the existing income fields and integer-cent money input.
- Keep income sources optional; a person may still be created without income.

## Resume here

Update the onboarding payload from one optional income to an optional income array,
then wire repeatable rows without changing regular household CRUD.

See `docs/WORKFLOW.md` for how this file is used.
