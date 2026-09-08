# Current work

**Feature:** F30 – Scrubbing the trend chart
**Status:** in progress
**Started:** 2026-09-08

## Goal

The month-by-month trend stops being a picture and becomes the way you read the months.
Dragging along the chart — or arrowing through it with the keyboard — moves a guide line
and a readout of that month's five figures, so twelve months of history are reachable
without leaving the dashboard or reloading a single page.

## Scope

- In: a guide line and emphasised markers at the picked month; a readout of income, fixed
  costs, variable costs, savings rate and free cash for it; pointer (mouse and touch) and
  keyboard input; `role="slider"` semantics so the interaction exists for a screen reader
  too.
- In: the readout carries the series colours, which is what the separate legend list was
  for — so that list goes away rather than repeating the same five dots.
- Out: axis ticks and labels. Worth having, but a different change.
- Out: the KPI row at the top of the page. It sits about 2000 px above the chart at
  375 px, so driving it from here would animate something nobody can see. The readout
  lives in the chart's own card instead, with the same five figures in the same order.
- Out: the full monthly data list under the chart. It stays: it is the complete record and
  it is what a reader gets with no JavaScript at all.

## Plan

- [ ] `app/(app)/trend-series.ts` — the series definition, out of `page.tsx` so a server
      component and a client one can share it
- [ ] `app/(app)/trend-chart.tsx` — the client island: readout, guide line, pointer and
      keyboard handling
- [ ] `app/(app)/page.tsx` — hand the chart over, keep the card, title and data list
- [ ] Copy for the slider in `lib/i18n/en.ts` and `lib/i18n/de.ts`
- [ ] `npm run check`, then 375 px

## Notes / decisions

- The readout does not reset when the pointer leaves. There is no "leave" on a
  touchscreen, so resetting would make the mouse behave differently from the finger in a
  mobile-first app — and a figure you can still read after moving away is more useful than
  one that snaps back.
- `touch-action: pan-y` on the chart: a horizontal drag scrubs, a vertical one still
  scrolls the page. A chart that swallows vertical scrolling on a phone is hostile.
- The chart starts on the last month rather than on nothing, so the readout is never empty
  and `aria-valuenow` always has a value. The last month is also the one the dashboard is
  already about.
- No motion on the figures themselves. A scrub readout has to feel attached to the finger,
  and 200 ms of easing on a number is the opposite of that.

## Resume here

Start with `trend-series.ts`; `page.tsx` and the new client component both import from it.
