# Current work

**Feature:** F22 – Variable costs, planned or itemised
**Status:** in progress
**Started:** 2026-08-25

## Goal

The household can plan the costs that are not the same every month — groceries, fuel,
going out. Each item is one budget with a monthly figure, and each budget is kept in one
of two ways, chosen per item: **Plan** counts the planned figure and nothing else
("300 € fürs Essen"), **Detailliert** counts what was actually booked, receipt by receipt
with a date. Both feed the dashboard, the per-person breakdown and the trend, and variable
costs get their own screen in the main navigation.

## Scope

- In: a `variable_cost` budget with the same private/shared split model as fixed costs, a
  `variable_booking` per receipt, effective dating on the budget, the two modes, a month-
  aware screen at `/variable-kosten`, dashboard integration (KPI, per person, categories,
  trend), backup format version 3.
- Out: recurring bookings, receipt photos, importing bank statements, splitting a single
  receipt differently from its budget. The split belongs to the budget: a receipt is an
  amount and a date, nothing more.

## Decisions

Both taken by the household when asked:

- **Variable costs are split exactly like fixed ones.** Private belongs to one person,
  shared carries its own split mode and quota. The alternative — a plain household total —
  would have left the per-person figures on the dashboard silently incomplete, which is
  the one number this app exists to get right.
- **In `detailed` mode the booked sum counts immediately**, from the first receipt of the
  month, for the running month as well. It is the literal reading of "daraus wird
  ermittelt": what the dashboard reports is what was actually spent. The consequence is
  deliberate and needs to be visible in the UI — free cash starts a month high and falls
  as receipts arrive — so the screen always shows booked against planned, and the
  dashboard names the mode next to the figure.

## Plan

- [ ] Schema: `variable_cost`, `variable_cost_share`, `variable_booking` + migration
- [ ] `lib/domain/variable.ts` — which figure counts, pure and unit-tested
- [ ] `summariseHousehold` grows variable costs: totals, per-member, free cash
- [ ] `server/services/variable-costs.ts` — budgets and bookings, effective dating
- [ ] Dashboard service: variable costs in the month, in the categories, in the trend
- [ ] Backup version 3, still reading version 1 and 2
- [ ] `/variable-kosten`: month navigation, Privat/Gemeinsam segments, budget cards with
      booked-against-planned, receipt list, dialogs for both
- [ ] Fifth navigation item — check it survives 375 px before believing it
- [ ] Dashboard: KPI tile, per-person metrics, own section, trend line
- [ ] German copy, `docs/PLAN.md`, README, `npm run check`, 375 px

## Notes / decisions

- A budget carries `valid_from` / `valid_until` like every other dated entry (F19), so
  "wir geben jetzt 350 statt 300 fürs Essen aus" keeps the old months at 300. Bookings are
  dated by day and belong to the month they fall in; they are not effective-dated.
- Snapshots are deliberately left alone. They exist only for savings balances now — the
  trend is derived from dated entries — so extending that table would add a migration for
  a number nothing reads.

## Resume here

Start with the schema and the domain layer; everything else follows from the shape of
`summariseHousehold`.

See `docs/WORKFLOW.md` for how this file is used.
