# Current work

**Status:** idle — nothing in flight.

Last finished: **F27 – Extensions**. Upload a `.mjs` module under Settings → Extensions and
it runs on the server, contributing cards to the overview. `docs/extensions/` holds the
contract and a working example.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: there is no sandbox, by decision — an extension runs in the
application process with the real database handle, and the upload form says so before it
accepts a file. What the runtime does guarantee is narrower: a failing extension is caught,
recorded and skipped, a card that throws is dropped rather than failing the dashboard, and
`EXTENSIONS_ENABLED=false` loads none of them, which is the way out when a broken extension
takes the settings screen with it. Extensions live in `/data/extensions` so they survive an
image upgrade.

See `docs/WORKFLOW.md` for how this file is used.
