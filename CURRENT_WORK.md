# Current work

**Status:** idle — nothing in flight.

Last finished: **fixes #4 to #9** — password sign-in keeps the requested page, dates
follow the language, the login title and the shared cost placeholder are translated,
status badges read in the dark theme, and an unconfigured provider has a proper title.

Next up: a release, since F30, F04b and these fixes are on `main` but in no tag.

Note for whoever comes next: amounts and percentages still use `de-DE` in both languages
on purpose — amount input is parsed German-first. Whether an English instance should show
`€1,234.56` is an open product decision, not an oversight.

See `docs/WORKFLOW.md` for how this file is used.
