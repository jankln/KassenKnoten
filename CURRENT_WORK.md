# Current work

**Status:** idle — nothing in flight.

Last finished: **The fixed-costs totals count the current month only**. `listPrivateExpenses`
and `listSharedExpenses` take the period they describe, every row says whether it counts in
it, and the per-person, private, shared and grand totals add up only the rows that do. This
was the last screen reading every active row; income was fixed in #1 and variable costs
were always queried by period.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: `sumApplying` is exported from `server/services/expenses.ts`
and is the one place that decides what belongs in a fixed-cost total. Anything new that
adds up expense rows should call it rather than reducing `monthlyCents` again.

See `docs/WORKFLOW.md` for how this file is used.
