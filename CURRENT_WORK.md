# Current work

# Current work

**Status:** idle — nothing in flight.

# Current work

# Current work

# Current work

# Current work

**Status:** idle — nothing in flight.

# Current work

**Feature:** F15 – Export and backup
**Status:** in progress
**Started:** 2026-08-21

## Goal

The household can download a complete JSON/CSV backup and restore a validated JSON
backup without exposing data or partially overwriting the database.

## Scope

- In: authenticated JSON export, CSV export, validated transactional JSON restore,
  settings UI, and tests.
- Out: scheduled backups, cloud storage, and importing arbitrary CSV files.

## Plan

- [ ] Add versioned export serialization and authenticated download routes/actions.
- [ ] Add strict restore validation with transaction and safe replacement semantics.
- [ ] Add German settings UI and documentation for backup/restore.
- [ ] Add focused tests and update the roadmap.
- [ ] Run the full check, reset this file, commit, and push.

## Notes / decisions

- JSON is the canonical restore format; CSV is download-only for portability.
- Restore requires an explicit confirmation and replaces active and historical household
  data atomically, while preserving system categories.

## Resume here

Inspect route-handler and settings patterns, then define a versioned export contract
covering every persisted household table.

See `docs/WORKFLOW.md` for how this file is used.
