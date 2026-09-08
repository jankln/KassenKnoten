# Current work

**Status:** idle — nothing in flight.

Last finished: **F30 — the trend chart is read month by month.** Dragging along it, or
arrowing through it, moves a guide line and a readout of that month's five figures. The
readout carries the series colours, so it replaced the separate legend rather than being
added next to it; the full monthly list underneath stays, because it is the whole record
and it is what a reader gets with no JavaScript.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: `lib/format.ts` builds every `Intl` formatter with a fixed
`de-DE` locale, so an English instance reads "Juni 2026" in an otherwise English page.
That predates this work and is visible anywhere a month is named — the month navigation,
the trend readout, the new data list. Fixing it means threading the household locale into
the formatters, which is its own change.

See `docs/WORKFLOW.md` for how this file is used.
