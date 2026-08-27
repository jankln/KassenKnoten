# Current work

**Status:** idle — nothing in flight.

Last finished: **the scanner is findable before there is an item.** The launcher shortcut
no longer lands on an empty state that says nothing about scanning, and the ordinary
empty state names the feature. Shipped in `main`, not yet in a tag — the released 1.3.0
still has the old empty states.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: `needsItemToScan` in `app/(app)/variable-kosten/page.tsx` is
keyed on the scan targets, not on the segment being empty. The shared segment can be
empty while two private budgets sit one tab away, and scanning works fine then.

See `docs/WORKFLOW.md` for how this file is used.
