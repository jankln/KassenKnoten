# Current work

**Feature:** Fix #10 – receipt scanning works in the Docker image
**Status:** in progress
**Started:** 2026-09-14

## Goal

A receipt scanned on an instance running the published image is read, as it is under
`next dev`. Today the recognition worker cannot start there, because the standalone build
lacks modules the worker imports.

## Scope

- In: `outputFileTracingIncludes` carries the worker's dependencies.
- In: a check that walks the worker's `require` graph inside `.next/standalone` and fails
  the image build when anything is missing, so this cannot ship silently again.
- Out: the hang when a worker fails to start — that is #11, its own commit.
- Out: recognition accuracy.

## Plan

- [ ] `scripts/verify-standalone.mjs`, run against the current build: must report the
      missing modules
- [ ] add the modules to the trace; the check passes
- [ ] run the check in the Dockerfile after `npm run build`
- [ ] standalone server: scan both test receipts end to end

## Notes / decisions

- Tesseract starts its worker from a file path in a `worker_threads` thread, which the
  tracer cannot follow. Listing packages by hand is the only lever `next.config.ts` has;
  the check is what keeps the list honest.

## Resume here

Write the check first and watch it fail on the current build.
