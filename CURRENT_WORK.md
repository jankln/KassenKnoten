# Current work

**Feature:** Fix #7 – status badges readable in the dark theme
**Status:** in progress
**Started:** 2026-09-14

## Goal

The small brass status pills — Settings → Extensions, Settings → Sign-in, and the plan
badge on variable costs — can be read in the dark theme as well as the light one.

## Scope

- In: one shared badge style instead of three copies of `bg-brass/15 text-brass-ink`.
- Out: any other colour in either theme.

## Plan

- [ ] find a text colour that reads on the brass tint in both themes, checked by contrast
- [ ] apply it in all three places
- [ ] `npm run check`, then screenshots in both themes at 375 px

## Notes / decisions

- `--color-brass-ink` is meant for text on a solid brass fill. On a 15 % tint over the
  dark surface it is nearly the surface's own colour.

## Resume here

Measure the contrast first, then change the classes.
