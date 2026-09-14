# Current work

**Status:** idle — nothing in flight.

Last finished: **F31 — automatic backups.** Once a day, when something changed, the server
writes the versioned JSON backup into `backups/` beside the database (`/data/backups` in
the image), owner-only and atomically, keeps the newest `BACKUP_KEEP` (default 14, `0`
off), and lists them for download under Settings → Back up your data. Verified on the
standalone build: first backup after 28 s, identical download, 401-equivalent redirect
without a session, crafted names refused, restore from the downloaded file.

Caught while verifying, before commit: a path built from the environment in `lib/env.ts`
made Turbopack trace the whole project into the standalone output — a local build carried
`.env`, `data/` and the spreadsheet. Fixed with `turbopackIgnore`, and
`scripts/verify-standalone.mjs` now fails a build that traced source or data files.

Next up: a release — #15 and F31 are on `main` only.

Notes for whoever comes next:

- The README's tests badge is still a static number.
- Not yet tried against a live Authentik, only against `oidc-provider`.

See `docs/WORKFLOW.md` for how this file is used.
