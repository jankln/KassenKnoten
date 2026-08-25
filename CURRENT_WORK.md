# Current work

**Status:** idle — nothing in flight.

Last finished: **F22 – Variable costs, planned or itemised**. Budgets for what is not the
same every month live at `/variable-kosten`, one month at a time. Each budget is kept in
one of two ways: **Plan** counts the planned figure and asks nothing more, **Detailliert**
counts what was actually booked, receipt by receipt with a date. Both are split between
members exactly like fixed costs, and both reach the dashboard — its own KPI tile, its own
section, the per-person breakdown, the category bars and the trend line.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: the subtle part is `updateVariableCost`. When a budget's
start moves forward the row splits like any other dated entry — and the receipts dated on
or after the new start have to move onto the new row with it, or they sit on a row that is
no longer valid in their own month and silently stop counting. There is a test named after
exactly that.

See `docs/WORKFLOW.md` for how this file is used.
