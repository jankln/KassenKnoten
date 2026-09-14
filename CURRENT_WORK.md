# Current work

**Status:** idle — nothing in flight.

Last finished: **fixes #10, #11 and #12** — the receipt scanner starts in the image, a
worker that cannot start ends the scan instead of hanging it, and photographed receipts
with uneven lighting keep their total (Sauvola thresholding, both language models).

Next up: a patch release, 1.4.1 — every release since 1.3.0 ships a scanner that cannot
start in the image.

Notes for whoever comes next:

- A worker thread that dies while loading a module never reaches tesseract.js'
  `errorHandler`; that case ends at the 45-second deadline. `scripts/verify-standalone.mjs`
  keeps it out of the image.
- The merchant can come back with leading OCR noise, e.g. `| Kaufland`. Not yet an issue.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first.

See `docs/WORKFLOW.md` for how this file is used.
