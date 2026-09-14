# Current work

**Feature:** F32 – Settings in categories
**Status:** in progress
**Started:** 2026-09-14

## Goal

Settings stop being one long column of eight unrelated cards. `/einstellungen` becomes an
overview of five categories, each its own page, so finding the sign-in or the backups no
longer means scrolling past the language and the category list at 375 px.

## Scope

- In: `/einstellungen` — the categories, each with an icon and one line saying what is in
  it.
- In: one page per category:
  - `allgemein` — language, appearance, install as app
  - `planung` — default split, categories
  - `anmeldung` — sign-in
  - `daten` — automatic backups, download, restore
  - `erweiterungen` — extensions
- In: phone — overview, then the category with a way back; desktop — the category list
  beside every category page, so switching needs no detour.
- In: each page loads only what it shows (extensions are no longer loaded to change the
  language); titles per page; copy in both languages.
- Out: changing any setting's behaviour or wording beyond headings and hints.

## Plan

- [ ] `settings-sections.ts`: the five categories, their slugs, icons and copy keys; test
- [ ] overview page, `[bereich]`-free static routes per category, shared layout with the
      desktop list
- [ ] move each card to its category page unchanged
- [ ] copy in `en.ts` / `de.ts`
- [ ] `npm run check`, every page at 375 px and desktop width, both themes; smoke test

## Notes / decisions

- Real routes rather than one page with tabs: a category can be linked to, the back button
  works, and each page renders only its own data.
- German slugs, like every other route in the app.

## Resume here

Start with `settings-sections.ts`, then the layout.
