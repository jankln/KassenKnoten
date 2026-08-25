# Current work

**Status:** idle — nothing in flight.

Last finished: **Fix #1 – the income total counts the current month only**.
`listMembersWithIncome` now takes the period it describes and sums only the incomes that
cover it, the way the dashboard always did. All rows stay listed, with their validity
note; the figure next to a name and the total underneath are this month's.

Note for whoever comes next: `listPrivateExpenses` in `server/services/expenses.ts` has
the same flaw — it sums every row regardless of validity, so a fixed cost that ended in
June still shows up in the private total on the fixed-costs screen. Same fix, separate
commit.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

See `docs/WORKFLOW.md` for how this file is used.
