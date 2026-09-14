# Current work

**Status:** idle — nothing in flight.

Last finished: **fix #10** — receipt scanning works in the standalone build, and the image
build now runs a real recognition so it cannot ship broken again.

Next up: **#11** — a worker that fails to start hangs the scan forever. Then a patch
release, because 1.3.0 to 1.4.0 all ship a scanner that cannot start.

Notes for whoever comes next:

- tesseract.js 7 loads the full engine build under Node regardless of `legacyCore`; the
  tracing list in `next.config.ts` follows what really loads, and
  `scripts/verify-standalone.mjs` fails the image build the day that changes.
- Recognition quality on a real supermarket receipt is poor: the large bold total line is
  not read, so the draft proposes the largest item amount instead. Separate from #10.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first.

See `docs/WORKFLOW.md` for how this file is used.
