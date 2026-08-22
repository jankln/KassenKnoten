# Current work

**Status:** idle — nothing in flight.

Last finished: **F19 – Effective-dated incomes and fixed costs, month navigation**. Every
income and fixed cost carries the months it applies to, the dashboard steps through
months with arrows, and each month is computed from what was valid in it. Editing an
entry with a later start splits it, so a raise in September leaves August alone.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Notes for whoever comes next:

- Savings pots are deliberately not dated. A pot has a balance, which is a value as of
  now, not something valid for a range. Because of that a month with no incomes and no
  fixed costs renders an empty state instead of KPIs — otherwise it would report an
  undated savings rate against no income and warn about a shortfall that never happened.
- Snapshots still exist but no longer feed the trend, which is computed. They record
  savings balances, which nothing else does.
- Backup format is at version 2. Version 1 files still restore; their entries are dated
  to the creation month of the household in the same file.

See `docs/WORKFLOW.md` for how this file is used.
