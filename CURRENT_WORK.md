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
- In: a synthetic shadowed receipt as a fixture, and a test that runs the real engine on
  it and expects the total from the `SUMME` line.
- Out: resolution, preprocessing in the browser, parser changes. Measured: resolution
  does not help; Sauvola alone does.

## Plan

- [ ] fixture `scripts/fixtures/receipt-shadow.webp` (synthetic, no real data)
- [ ] test with the real engine, failing today
- [ ] `setParameters` in `ocr.ts`, inside the start deadline
- [ ] `npm run check`, standalone build check, scan both sample receipts again

## Resume here

Add the fixture and the failing test first.
