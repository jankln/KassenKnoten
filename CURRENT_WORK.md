# Current work

**Status:** idle — nothing in flight.

Last finished: **F20 – Making a raise an explicit choice**. When the amount of an existing
income or fixed cost changes, the dialog asks what the change means instead of inferring
it from whether a date field was touched. "Neuer Betrag ab" keeps the old value for the
months before and is preselected; "War schon immer so" overwrites the entry retroactively.
A preview shows the rows that will exist after saving.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: the server logic is unchanged from F19 — it already splits an
entry whose start moves forward. F20 is entirely about making the safe outcome the one
that happens by default rather than the one that requires knowing about it.

See `docs/WORKFLOW.md` for how this file is used.
