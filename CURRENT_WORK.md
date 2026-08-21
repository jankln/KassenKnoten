# Current work

**Feature:** F16 – Mobile polish, animation pass, accessibility audit
**Status:** in progress
**Started:** 2026-08-21

## Goal

After this the app is usable by keyboard and screen reader without the navigation
standing in the way, no dialog can push its own actions off the top of a 375 px screen,
and the motion described in `docs/design.md` actually exists: numbers count to their
value, cards arrive in sequence, share bars re-proportion instead of jumping.

## Scope

- In: skip link, dialog scroll containment on phones, live regions for values that
  change while typing, touch target sizes, keypad hints, the CSS animation pass
  (count-up, staggered card entry, animated bars), reduced-motion coverage.
- Out: OIDC (F04b), Docker and security headers (F17), Playwright smoke test — the plan
  parks it after the UI stabilizes, and this is the feature that stabilizes it.

## Audit findings this feature answers

1. **No skip link.** Every page starts with four navigation links; a keyboard user
   tabs through all of them to reach the content. WCAG 2.4.1 Bypass Blocks, Level A.
2. **Bottom sheets cannot scroll.** `DialogContent` is anchored to the bottom edge with
   no `max-height`. The shared-cost dialog with a split editor is taller than a 375 px
   phone, so its title and the first fields sit above the viewport, unreachable.
3. **Silent live values.** `MoneyInput` echoes "Kein gültiger Betrag" and the split
   preview recomputes per keystroke; neither is in a live region, so a screen reader
   user hears nothing until they leave the field.
4. **Wrong keypad.** The share field is `inputMode="numeric"` with `step="0.01"`; iOS
   then offers a digits-only keypad for a field that needs a decimal separator.
5. **40 px icon buttons** for edit and delete in every list — under the 44 px touch
   target the rest of the app meets.
6. **No motion beyond the dialog.** `docs/design.md` promises counting numbers and
   re-proportioning bars; neither exists.

## Plan

- [ ] Skip link in the authenticated shell, `<main id>` as its target
- [ ] Dialog: `max-h`/`overflow-y-auto`, `overscroll-contain`, dvh units
- [ ] Live regions on the money echo and the split preview
- [ ] Touch targets and keypad hints
- [ ] `CountUp` and `AnimatedBar` as CSS-driven primitives, applied to KPIs,
      category bars and savings progress
- [ ] Staggered card entry on the dashboard, RSC-safe (no client component added)
- [ ] Verify at 375 px with `scripts/screenshot.mjs`, light and dark
- [ ] `npm run check`

## Notes / decisions

- Framer Motion is not used; see the decision recorded in `docs/PLAN.md`. Motion is CSS
  keyframes driven by inline custom properties, which keeps server components on the
  server.
- The stagger delay is a `--enter-delay` custom property set by the server, so the
  animation needs no JavaScript and no hydration.

## Resume here

Start with the dialog scroll fix — it is the one finding that makes a screen unusable
rather than merely awkward.
