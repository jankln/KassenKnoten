# Current work

# Current work

**Status:** idle — nothing in flight.

# Current work

**Feature:** F12 – Dashboard
**Status:** in progress
**Started:** 2026-08-21

## Goal

The household gets a useful monthly overview with total income, fixed costs, savings,
free cash, per-person remainder, savings progress, category totals, and calm warnings.

## Scope

- In: dashboard data assembly, responsive German presentation, KPI cards, per-person
  breakdown, category visualization, savings progress, and guard-rail warnings.
- Out: historical snapshots and trend charts, which belong to F13.

## Plan

- [ ] Assemble the persisted household data through the pure summary domain function.
- [ ] Add category and savings progress dashboard sections with German copy.
- [ ] Build the responsive dashboard UI and empty state navigation.
- [ ] Add focused service/UI data tests and update the roadmap.
- [ ] Run the full check, reset this file, commit, and push.

## Notes / decisions

- Keep all calculations in `lib/domain/summary.ts`; the dashboard only maps database rows
  into its plain input shape.
- Amounts remain integer cents and display through the existing German formatter.

## Resume here

Read the current service and component patterns, then add a dashboard query service and
compose the existing pure summary with responsive cards.
