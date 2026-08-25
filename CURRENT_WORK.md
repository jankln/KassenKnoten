# Current work

**Status:** idle — nothing in flight.

Last finished: **F21 – Installable as an app (PWA)**. KassenKnoten can be added to the
home screen or the app list from `/einstellungen`, with its own icon, and opens without
an address bar. Browsers that cannot install a web app get the path through their own
menu instead of a button that does nothing. The service worker deliberately caches no
household data at all — only the offline screen, the icons and content-hashed
`/_next/static/` assets — so offline the app says it is offline rather than showing stale
money.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: the icons are generated, not hand-made. Change
`app/icon.svg` and run `node scripts/generate-icons.mjs` to redraw every PNG in
`public/icons/`.

See `docs/WORKFLOW.md` for how this file is used.
