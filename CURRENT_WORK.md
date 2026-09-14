# Current work

**Feature:** Fix #13 – the scanned merchant name loses leading OCR noise
**Status:** in progress
**Started:** 2026-09-14

## Goal

A photographed receipt proposes "Hofladen Waldeck", not "| Hofladen Waldeck".

## Scope

- In: `findLabel` in `lib/domain/receipt.ts` drops leading and trailing characters that
  are neither letters nor digits; tests.
- Out: anything inside the name. A name is still returned as printed.

## Plan

- [ ] tests for `| `, `; `, `/ ` in front and a stray mark behind; `e.K.` and `7-Eleven`
      unchanged
- [ ] `findLabel`
- [ ] `npm run check`

## Resume here

Tests first, in `lib/domain/receipt.test.ts` under "the merchant".
