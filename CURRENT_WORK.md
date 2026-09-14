# Current work

**Status:** idle — nothing in flight.

Last finished: **fix #11** — a recognition worker that cannot start ends the scan within
the deadline, and the next scan starts fresh.

Next up: a patch release, 1.4.1. Every release since 1.3.0 ships a scanner that cannot
start in the image (#10); `main` has the fix and `edge` carries it.

Notes for whoever comes next:

- A worker thread that dies while loading a module never reaches tesseract.js'
  `errorHandler` — there is no `error` listener on the thread, so Node reports it as an
  `uncaughtException` in the server and the start simply never finishes. That case ends
  at the 45-second deadline, not at once. Failing faster would mean patching tesseract.js;
  `scripts/verify-standalone.mjs` keeps the case out of the image instead.
- Recognition quality on a real supermarket receipt is poor: the large bold total line is
  not read, so the draft proposes the largest item amount instead.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first.

See `docs/WORKFLOW.md` for how this file is used.
