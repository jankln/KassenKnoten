# Current work

**Feature:** F28 – A landing page in both languages
**Status:** in progress
**Started:** 2026-08-25

## Goal

The landing page speaks English and German, like the product now does. English lives at
`/`, German at `/de/`, each page says so to search engines, and a switcher in the header
moves between them.

## Scope

- In: an English page, the existing German one moved to `/de/`, one shared stylesheet, a
  language switcher, `hreflang` annotations, and the new features named on both.
- Out: a third language, translated screenshots, automatic redirection by browser
  language.

## Decisions

- **English at `/`, German at `/de/`.** The application defaults to English since F26 and
  the README is English; a shop window that opens in a different language than the product
  would be a strange greeting.
- **The stylesheet moves out of the HTML.** Two pages with a copy each of four hundred
  lines of CSS is two pages that drift apart. One `style.css` beside them keeps the build
  step at zero and the design in one place.
- **No redirect by browser language.** A page that sends a visitor somewhere they did not
  ask to go is a page that has to be argued with. `hreflang` tells search engines, and a
  switcher in the header tells everyone else.

## Plan

- [ ] Extract `site/style.css` from the existing page
- [ ] `site/index.html` in English, `site/de/index.html` in German
- [ ] Switcher in the header of both, `hreflang` and `og:locale`
- [ ] Both pages mention the two languages and extensions
- [ ] README note about the page being German-only removed
- [ ] Checked at 375 px and desktop, in both themes, deployed and verified live

## Notes / decisions

- Image paths differ by one level between the two pages; the workflow copies `docs/media`
  into `site/media` unchanged, so `/de/` reaches them with `../media/`.

## Resume here

Start by extracting the stylesheet — both pages depend on it existing.

See `docs/WORKFLOW.md` for how this file is used.
