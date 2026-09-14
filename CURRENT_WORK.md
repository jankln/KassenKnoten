# Current work

**Feature:** Fix #11 – a worker that cannot start ends the scan instead of hanging it
**Status:** in progress
**Started:** 2026-09-14

## Goal

When the recognition worker fails while starting, the scan answers with the existing
"could not be read" message within the same time budget as a slow recognition, and the
next scan starts a fresh worker instead of waiting behind the stuck one.

## Scope

- In: `server/receipts/ocr.ts` — one deadline covering start and recognition; the
  worker's `errorHandler` rejects a pending start; a start that completes after it was
  given up on is terminated rather than adopted.
- In: tests with a mocked `tesseract.js` — a start that errors, a start that never
  finishes, and the scan after each.
- Out: recognition quality.

## Plan

- [ ] tests first, failing against today's code
- [ ] `ocr.ts`
- [ ] `npm run check`; standalone server with a model path that does not exist answers 500
      quickly and recovers

## Resume here

Start with `server/receipts/ocr.test.ts`.
