# Current work

# Current work

**Status:** idle — nothing in flight.

**Feature:** F11 – Excel import
**Status:** in progress
**Started:** 2026-08-21

## Goal

Households can import the legacy `Finanzplan.xlsx` workbook once to seed members,
incomes, fixed costs, shared splits, and savings pots without manually re-entering
the spreadsheet.

## Scope

- In: a dry-run-first CLI importer, documented legacy-sheet mapping, validation,
  idempotent import into the existing SQLite schema, and safe handling of unknown rows.
- Out: ongoing spreadsheet synchronization, dashboard changes, and importing historical
  monthly snapshots.

## Plan

- [ ] Add the workbook parser and explicit mapping for the documented sheets.
- [ ] Add transactional database import with validation and dry-run output.
- [ ] Add importer tests using generated in-memory workbooks without household data.
- [ ] Document usage and mark F11 complete.
- [ ] Run the full check, reset this file, commit, and push.

## Notes / decisions

- The workbook is an input supplied by the operator and remains gitignored.
- Never copy workbook values into source, tests, documentation, or commit messages.
- Import is opt-in and dry-run by default so an existing household cannot be overwritten
  accidentally.

## Resume here

Add the workbook dependency only after choosing the parser, then implement and test the
import mapping against the documented legacy layout.
