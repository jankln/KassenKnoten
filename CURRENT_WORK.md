# Current work

**Status:** idle — nothing in flight.

Last finished: **F17 – Docker image, compose file, security headers, setup
documentation**. Milestone D is complete, and with it the roadmap as planned: the app
builds to a standalone server, ships as one container with the SQLite file on a volume,
and sets a nonce-based CSP plus the rest of the security headers on every response.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request. It is the
only unticked item. The README documents what Authentik will need and states plainly
that the mode does not exist yet.

Known caveat from F17: the Docker daemon was unavailable in the environment where the
image was written, so `docker build` itself has never been executed. Everything the
image depends on was verified by running the standalone output directly — a cold start
against an empty database, migrations reaching the runtime, better-sqlite3 loading, the
headers, and every page interactive under the CSP.

See `docs/WORKFLOW.md` for how this file is used.
