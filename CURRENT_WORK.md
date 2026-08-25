# Current work

**Status:** idle — nothing in flight.

Last finished: **Fix #3 – extensions findable from the main README**. The header nav and
the feature table mention them, and the Extensions section links the guide and
`savings-runway.mjs` as two separate things to read.

Note for whoever comes next: `listPrivateExpenses` in `server/services/expenses.ts` sums
every row regardless of validity, so a fixed cost that ended in June still shows up in the
private total on the fixed-costs screen. Same fix as #1, separate commit.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

See `docs/WORKFLOW.md` for how this file is used.
