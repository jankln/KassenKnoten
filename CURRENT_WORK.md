# Current work

**Feature:** Fix #5 – dates follow the household's language
**Status:** in progress
**Started:** 2026-09-14

## Goal

An English instance reads "June 2026" and "03/08", a German one "Juni 2026" and "03.08.",
wherever a month or a day is named.

## Scope

- In: `formatPeriod` and `formatDay` take the messages, like `formatInterval` already does,
  and the messages name the `Intl` locale for their language.
- Out: amounts and percentages. Input is parsed German-first, and showing one number
  format while parsing another would be a new inconsistency; that is its own decision.

## Plan

- [ ] `intlLocale` in `en.ts` / `de.ts`
- [ ] `formatPeriod(period, t)`, `formatDay(date, t)`, formatters cached per locale; tests
- [ ] every caller passes its messages
- [ ] `npm run check`, then the dashboard and variable costs in both languages at 375 px

## Resume here

Start with `lib/format.ts`; the compiler lists every caller once the signatures change.
