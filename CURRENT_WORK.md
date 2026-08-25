# Current work

**Feature:** F24 – Landing page and a README that sells
**Status:** in progress
**Started:** 2026-08-25

## Goal

KassenKnoten gets a public face: a landing page published through GitHub Pages that says
what the software does and for whom, and a README rewritten to lead with capability
rather than with prose. Somebody who lands on either should know within ten seconds
whether this is the thing they have been looking for.

## Scope

- In: `site/` with a self-contained landing page and its images, a GitHub Actions workflow
  that publishes it to Pages, fresh screenshots of the screens that F19–F23 added, and a
  restructured README with the current feature set.
- Out: a custom domain, analytics of any kind, a blog, English copy for the landing page
  (see the decision below), documentation site generators.

## Decisions

- **The landing page is German, the README stays English.** They speak to two different
  people. The landing page is the product's shop window and the product is German-only
  from the first label to the last error message — an English page promising an app the
  visitor cannot read would be a bait. The README is read by whoever is going to run and
  modify it, and `docs/WORKFLOW.md` already fixes that as English.
- **No build step and no framework for the page.** One `index.html`, inline CSS, the app's
  own tokens from `docs/design.md`. A landing page that needs `npm run build` is a landing
  page that breaks silently six months after anyone last touched it.
- **Published from `site/` by a workflow, not from `docs/`.** `docs/` holds the project's
  own documents; pointing Jekyll at it would try to render `PLAN.md` and `WORKFLOW.md` as
  pages. A dedicated folder keeps the two jobs apart.
- **Screenshots come from the example household.** The container's database holds exactly
  the Alex/Robin figures `docs/WORKFLOW.md` documents — verified before capturing anything,
  because screenshots go into a repository that may become public and git history cannot be
  un-published.

## Plan

- [ ] Verify once more that the instance being photographed holds only example data
- [ ] Fresh screenshots: dashboard (desktop and phone/dark), variable costs with receipts,
      shared costs with the split, the login with its second factor
- [ ] `site/index.html` — hero, the problem, what it does, screenshots, self-hosting,
      security, a footer pointing at the repository
- [ ] `site/.nojekyll`, `site/media/`
- [ ] `.github/workflows/pages.yml` — upload-pages-artifact + deploy-pages
- [ ] README: stronger opening, feature grid, current screenshots, link to the page
- [ ] `npm run check`, page checked at 375 px and on a desktop width, both themes

## Notes / decisions

- The page has to work in both colour schemes without a toggle: it is one file, and
  `prefers-color-scheme` is the honest way to respect what the visitor already chose.
- Fonts: the app self-hosts them under a strict CSP. The landing page has no such
  constraint, so it may load them from Google Fonts, with a real fallback stack so the
  page never depends on that request succeeding.

## Resume here

Start with the screenshots — the page and the README are both laid out around them.

See `docs/WORKFLOW.md` for how this file is used.
