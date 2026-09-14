# Current work

**Feature:** Fix #14 – Next.js 16.3.5 and sharp 0.35.4 for published advisories
**Status:** in progress
**Started:** 2026-09-14

## Goal

The image no longer ships the `next` and `sharp` versions named in the 2026-09-08
advisories (critical, image optimization; high, libheif).

## Scope

- In: `next` and `eslint-config-next` to 16.3.5; `sharp` to 0.35.4 or later as Next's
  dependency; the non-breaking `js-yaml` update.
- Out: `drizzle-kit` / `esbuild` and `exceljs` / `uuid` — development-only, not
  exploitable here, and npm's fix is a breaking downgrade. Reasons are in #14.

## Plan

- [ ] read the Next.js 16.3.3–16.3.5 release notes for anything that changes behaviour
- [ ] update, `npm audit` shows only the two assessed findings
- [ ] `npm run check`, standalone build + `verify-standalone`, `npm run test:e2e`
- [ ] `sharp` version inside `.next/standalone`

## Resume here

Release notes first, then `npm i next@16.3.5 eslint-config-next@16.3.5`.
