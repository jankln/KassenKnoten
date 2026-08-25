# Current work

**Status:** idle — nothing in flight.

Last finished: **F24 – Landing page and a README that sells**. `site/index.html` is a
self-contained German landing page — one file, no build step, the app's own "Papier &
Tinte" tokens, light and dark from `prefers-color-scheme`. A workflow in
`.github/workflows/pages.yml` publishes it to GitHub Pages on every push that touches
`site/` or `docs/media/`. The README now leads with a scannable feature table and current
screenshots instead of prose alone.

**One manual step remains:** the repository's Pages source has to be set to
"GitHub Actions" under Settings → Pages → Build and deployment. Until then the workflow
runs and fails at the deploy step.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: the screenshots live once, in `docs/media/`, and the workflow
copies them into the artifact as it is assembled. Do not add a second copy under `site/` —
one screenshot that can go out of date on two paths is two screenshots.

See `docs/WORKFLOW.md` for how this file is used.
