# Current work

**Status:** idle — nothing in flight.

Last finished: **F17 – Docker image, compose file, security headers, setup
documentation**. Milestone D is complete, and with it the roadmap as planned: the app
builds to a standalone server, ships as one container with the SQLite file on a volume,
and sets a nonce-based CSP plus the rest of the security headers on every response.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request. It is the
only unticked item. The README documents what Authentik will need and states plainly
that the mode does not exist yet.

The F17 caveat is resolved: the image has now been built and run. `docker compose up`
produced a 412 MB image, the container reports healthy on its own health check and runs
as uid 1000, a cold start created and migrated the database on the volume (1 migration,
12 seeded categories), signing in works, and every security header is present with no
CSP violations in the browser.

See `docs/WORKFLOW.md` for how this file is used.
