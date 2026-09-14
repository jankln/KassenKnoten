# Current work

**Feature:** README and landing page describe the product as it is today
**Status:** in progress
**Started:** 2026-09-14

## Goal

Somebody reading the README or the landing page sees the application as it currently is —
every feature it has, in screenshots taken from the current version — and not a history of
what arrived in which release.

## Scope

- In: fresh screenshots in `docs/media/` (German) and `docs/media/en/` (English), from
  the standalone build running the documented example household: overview with the trend
  readout, shared costs, variable costs, savings, phone in dark mode, sign-in; new ones
  for the receipt scanner and the settings.
- In: README — the feature table, the sections and the Status paragraph read as a
  description of today, not a changelog; the receipt scanner, settings categories, the
  trend readout and CI get their place.
- In: `site/index.html` and `site/de/index.html` — the same: receipt scanner, sign-in
  with an identity provider, automatic backups, settings, the trend; security section
  with OIDC; setup commands as the README has them.
- Out: the app itself. Release notes stay what they are — history belongs there.

## Plan

- [ ] example household in a throwaway database (Alex 2050 €, Robin 2310 €, shared costs
      1182,35 €, a raise and costs starting in earlier months so the trend has shape)
- [ ] capture every screen in both languages; check nothing personal is in any of them
- [ ] README
- [ ] both landing pages; check at 375 px and desktop, light and dark
- [ ] `npm run format:check`

## Notes / decisions

- No real household data: every figure comes from `docs/WORKFLOW.md`'s example household,
  and the receipt shown in the scanner is the synthetic fixture.

## Resume here

Build the example household database first.
