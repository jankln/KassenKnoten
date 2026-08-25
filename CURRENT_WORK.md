# Current work

**Feature:** F26 – English, and a language the household chooses
**Status:** in progress
**Started:** 2026-08-25

## Goal

The interface speaks English by default and German when asked. The choice is the first
thing the setup wizard offers and can be changed later in the settings, and it belongs to
the household rather than to a browser.

## Scope

- In: an English message set, a locale on the household, a picker in onboarding and in
  settings, every screen reading its copy through the active locale, the backup format
  carrying it, and the project's own language rule rewritten.
- Out: right-to-left layouts, translated dates beyond what `Intl` already does, a third
  language, machine translation of anything.

## Decisions

- **English becomes the default.** A fresh instance starts in English, which is what a
  self-hosted project handed to strangers should do; German is one click away and stays
  the language the product was designed in.
- **The locale lives on the household, not in a cookie.** The theme is a per-device
  preference and is stored per device; the language is not — a household that reads German
  reads German on the tablet in the kitchen too. It also means the login screen, which
  nobody has authenticated to yet, can still be in the right language.
- **The canonical shape comes from `en.ts`, and `de.ts` must satisfy it.** The compiler
  then refuses a build where a translation is missing a key, which is the only way a
  second language stays complete past the week it was added.
- **Client components take a locale string, not the messages.** The message objects hold
  functions for the strings that interpolate, and functions cannot cross the boundary into
  a client component. A tiny provider imports both sets and picks one.

## Plan

- [ ] `lib/i18n/en.ts` and an index that exposes both, with `de` checked against `en`
- [ ] `household.locale` column and migration; default `en`
- [ ] `getMessages()` for server components, `MessagesProvider` + `useMessages()` for client
- [ ] Every `de.x` in 57 files becomes the active locale's `x`
- [ ] Language as the first step of the wizard and a card in the settings
- [ ] Backup version 4, still reading 1 to 3
- [ ] `AGENTS.md`, `docs/WORKFLOW.md`, `docs/PLAN.md`, README
- [ ] `npm run check`, both languages walked through at 375 px

## Notes / decisions

- `docs/WORKFLOW.md` currently makes German UI text a non-negotiable. That rule was right
  when there was one language; it now becomes "no hardcoded copy in components, every
  string in the message sets, and both sets complete".

## Resume here

Start with `en.ts` — everything else is mechanical once the shape is fixed.

See `docs/WORKFLOW.md` for how this file is used.
