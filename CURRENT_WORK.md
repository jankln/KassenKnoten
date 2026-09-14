# Current work

**Feature:** Fix #6 – login tab title follows the household's language
**Status:** in progress
**Started:** 2026-09-14

## Goal

The login page's browser tab reads "Sign in · KassenKnoten" on an English instance and
"Anmelden · KassenKnoten" on a German one.

## Scope

- In: `login.title` in both message files; the page resolves it with `generateMetadata`,
  like every other page.
- Out: anything else on the login page.

## Plan

- [ ] copy in `en.ts` and `de.ts`
- [ ] `generateMetadata` in `app/(auth)/login/page.tsx`
- [ ] `npm run check`, then the `<title>` in both languages

## Resume here

Two small edits; start with the copy.
