# Current work

**Feature:** F05 – App shell
**Status:** in progress
**Started:** 2026-08-21

## Goal

The frame every screen from here on lives in: navigation that works on a phone and on a
desktop, one place where all German copy lives, and the money and date formatting the
whole app will use. After this, adding a feature means adding a page, not re-deciding
layout.

## Scope

- In: `lib/i18n/de.ts` (all UI copy), `lib/format.ts` (money, percent, interval and month
  formatting plus parsing German amount input), the authenticated layout with a desktop
  sidebar and a mobile bottom bar, theme toggle, sign-out, small UI primitives (button,
  card, page header, empty state), and placeholder pages for the five sections so the
  navigation is real rather than decorative.
- Out: any actual household data on those pages — that starts with F06.

## Plan

- [ ] `lib/i18n/de.ts`: navigation, actions, section headings, interval labels
- [ ] `lib/format.ts` + tests: formatCents, parseAmount, formatPercent, formatInterval,
      formatMonth
- [ ] UI primitives: Button, Card, PageHeader, EmptyState
- [ ] `app/(app)/layout.tsx`: sidebar on desktop, bottom bar on mobile, header on both
- [ ] Theme toggle (light / dark / system)
- [ ] Placeholder pages: Übersicht, Haushalt, Fixkosten, Sparen, Einstellungen
- [ ] Verified by screenshot at 375 px and at desktop width, light and dark
- [ ] `npm run check` passes

## Notes / decisions

- Amount input is parsed German-first: `.` is a thousands separator, `,` is the decimal
  separator. A lone `.` followed by exactly one or two digits is read as a decimal point
  anyway, because that is what someone typing on a numeric keypad means — but `1.234`
  stays 1234 €, never 1,234 €.
- Four items in the mobile bottom bar, not five: settings lives in the header, so the
  targets stay comfortably wide at 375 px.
- Copy lives only in `lib/i18n/de.ts`. A German string hardcoded in a component is a bug,
  because it cannot be reviewed as a whole and drifts from the rest of the interface.

## Resume here

If interrupted: `npm run dev` and check which of the five routes still 404s.
