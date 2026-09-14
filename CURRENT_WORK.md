# Current work

**Feature:** Fix #12 – photographed receipts with uneven lighting keep their total
**Status:** in progress
**Started:** 2026-09-14

## Goal

A receipt photographed with a shadow across it — the ordinary phone case — is read with
its `SUMME` line, instead of the parser falling back to the largest item price.

## Scope

- In: the recognition worker binarises with Sauvola (`thresholding_method: 2`) instead of
  Tesseract's global Otsu threshold.
- In: the worker loads both language models, the household's language first. Decided
  2026-09-14 after measuring: Sauvola with the English model alone read the sample's
  bold total with a wrong digit and presented it as read, not guessed.
- In: a synthetic shadowed receipt as a fixture, and a test that runs the real engine on
  it and expects the total from the `SUMME` line.
- Out: resolution, preprocessing in the browser, parser changes. Measured: resolution
  does not help.

## Plan

- [ ] fixture `scripts/fixtures/receipt-shadow.webp` (synthetic, no real data)
- [ ] test with the real engine, failing today
- [ ] `setParameters` in `ocr.ts`, inside the start deadline
- [ ] both models from one directory: tesseract.js reads every language from a single
      `langPath`, and passing model data directly is broken upstream, so the two files
      are copied into a private temporary directory per process; if that fails, one
      language as before
- [ ] `npm run check`, standalone build check, scan both sample receipts again

## Notes / decisions

- Cost of the second model, measured: about 35 MB more while a worker is alive (128 MB
  instead of 93 MB) and about half a second more on a large photo.
- The temporary directory comes from `mkdtemp`, not a fixed name, so on a shared host
  nobody can place model files there first; it is removed when the process exits.

## Resume here

Add the fixture and the failing test first.
