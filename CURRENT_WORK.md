# Current work

**Status:** idle — nothing in flight.

Last finished: **fix #7** — status badges read in the dark theme, through one shared
`Badge` component.

Open bugs, in the order they are being fixed: #8 (unconfigured provider titled
"single sign-on"), #9 (German placeholder in the shared cost dialog).

Note for whoever comes next: amounts and percentages still use `de-DE` in both languages
on purpose — amount input is parsed German-first. Whether an English instance should show
`€1,234.56` is an open product decision, not an oversight.

See `docs/WORKFLOW.md` for how this file is used.
