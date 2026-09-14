# Current work

**Feature:** Fix #8 – an unconfigured provider has a proper title in the settings
**Status:** in progress
**Started:** 2026-09-14

## Goal

Without `OIDC_PROVIDER_NAME`, the provider row in Settings → Sign-in reads
"Identity provider" / "Identitätsanbieter" instead of a lower-case "single sign-on".

## Scope

- In: a title fallback next to the sentence fallback; the row uses the title.
- Out: the sentences, where "single sign-on" reads naturally.

## Plan

- [ ] copy in both message files
- [ ] the settings page passes a title; the card uses it for the row
- [ ] `npm run check`, then the card on a password-only instance in both languages

## Resume here

Start with the copy.
