# Current work

**Status:** idle — nothing in flight.

Last finished: **1.2.0, released**. `ghcr.io/jankln/kassenknoten:latest` is the manifest
`sha256:ca1f1bd0…` for amd64 and arm64, and its settings screen has Extensions on it. The
release carries `docker-compose.yml` and `env.example`; both documented curls were run
from an empty directory and serve 1.2.0.

The three reported issues are closed: the income total counts the current month only (#1),
the image is current (#2), and the README links the extension guide and the example (#3).

Note for whoever comes next: `listPrivateExpenses` in `server/services/expenses.ts` sums
every row regardless of validity, so a fixed cost that ended in June still shows up in the
private total on the fixed-costs screen. It is the same flaw #1 fixed for income, on a
different screen, and it wants the same fix in a commit of its own.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

See `docs/WORKFLOW.md` for how this file is used.
