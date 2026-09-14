# Current work

**Status:** idle — nothing in flight.

Last finished: **1.4.1 released.** `latest`, `1.4` and `1.4.1` are one manifest on amd64
and arm64, carrying a receipt scanner that starts in the image (#10), fails cleanly
instead of hanging (#11), reads shadowed photos (#12) and cleans the merchant name (#13).
The image build itself now proves a recognition works before publishing.

Nothing open on `docs/PLAN.md`.

Notes for whoever comes next:

- A worker thread that dies while loading a module never reaches tesseract.js'
  `errorHandler`; that case ends at the 45-second deadline.
- Measured on one real photo: the browser's 2000 px downscale reads its total, the
  original full-size photo still does not. The original is only sent when a browser
  cannot downscale.
- Not yet tried against a live Authentik, only against `oidc-provider`.
- Amounts and percentages use `de-DE` in both languages on purpose — amount input is
  parsed German-first.

See `docs/WORKFLOW.md` for how this file is used.
