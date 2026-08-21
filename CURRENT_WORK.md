# Current work

# Current work

**Status:** idle — nothing in flight.

# Current work

# Current work

**Feature:** F13 – Monthly snapshots and trend charts
**Status:** in progress
**Started:** 2026-08-21

## Goal

The household can see a stable monthly history of its plan, with the previous month
frozen automatically on the first request of a new month and a compact trend view on
the dashboard.

## Scope

- In: lazy snapshot creation, snapshot-member data, idempotent period handling, trend
  query, responsive German chart/table presentation, and tests.
- Out: manual historical editing, actual transaction tracking, and exports.

## Plan

- [ ] Add pure date/period helpers and snapshot persistence service.
- [ ] Trigger the previous-month snapshot lazily from the authenticated app shell/dashboard.
- [ ] Add trend data and a responsive dashboard visualization with accessible fallback.
- [ ] Add focused tests and update the roadmap.
- [ ] Run the full check, reset this file, commit, and push.

## Notes / decisions

- Snapshot calculations reuse `summariseHousehold`; the service supplies an explicit
  calculation date and never relies on ambient time in the domain layer.
- Snapshot rows retain member names and amounts so later edits do not rewrite history.

## Resume here

Inspect the current route shell and domain date conventions, then implement snapshot
creation as an idempotent transaction before wiring the trend view.
