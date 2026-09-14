# Current work

**Status:** idle — nothing in flight.

Last finished: **1.5.0 released.** `latest`, `1.5` and `1.5.0` are one manifest on amd64
and arm64, carrying automatic backups (F31) and the restore fix for instance settings
(#15).

Open from the improvement list of 2026-09-14: scanner robustness beyond one real photo
(server-side downscale as a fallback, more synthetic fixtures), a live test against
Authentik, the English number format decision, and the features parked in `docs/PLAN.md`.

Notes for whoever comes next:

- The README's tests badge is still a static number.
- `npm audit` still lists four moderate findings in development tooling; assessed in #14.

See `docs/WORKFLOW.md` for how this file is used.
