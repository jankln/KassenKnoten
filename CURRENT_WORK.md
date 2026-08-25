# Current work

**Status:** idle — nothing in flight.

Last finished: **Build hygiene for the extension store**. The four filesystem calls that
address the extensions volume carry `turbopackIgnore`, so the build no longer traces the
whole project into the standalone output it puts in the image.

Note for whoever comes next: `listPrivateExpenses` in `server/services/expenses.ts` sums
every row regardless of validity, so a fixed cost that ended in June still shows up in the
private total on the fixed-costs screen. Same fix as #1, separate commit.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

See `docs/WORKFLOW.md` for how this file is used.
