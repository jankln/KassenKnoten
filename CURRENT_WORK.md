# Current work

**Feature:** F27 – Extensions
**Status:** in progress
**Started:** 2026-08-25

## Goal

The household can extend KassenKnoten with its own code. An extension is uploaded in the
settings, runs on the server with full access to the household's data, and contributes
cards to the dashboard. Nothing is fetched from anywhere: what runs is what somebody put
there.

## Scope

- In: a single-file extension format with a manifest, a loader that isolates failures, an
  API surface of the database, the services, the domain helpers and a dashboard-card
  registration, management in the settings, an example extension, and an off switch.
- Out: a registry or catalogue to install from, extensions adding routes or middleware,
  extensions shipping their own client-side JavaScript, automatic updates.

## Decisions

- **Full server-side access, chosen deliberately.** I recommended sandboxed widgets and
  the household chose server plugins with full access, so that is what this builds. The
  consequence is stated where it matters rather than buried: uploading an extension is
  installing software on your server, the upload form says so in those words, and it takes
  an explicit confirmation. There is no security boundary here to pretend about.
- **`EXTENSIONS_ENABLED=false` exists for the same reason.** An extension that breaks the
  app also breaks the screen you would use to remove it. An environment switch is the way
  out that does not require editing SQLite by hand.
- **One file, not an archive.** A `.mjs` module exporting a manifest and a `register`
  function is inspectable before it runs, needs no extraction, and cannot carry a path
  traversal. Multi-file extensions can come later if anybody wants them.
- **Extensions live in the volume, not the image.** `/data/extensions` survives
  `docker compose pull`, which matters now that the image is immutable and published.
- **A failing extension is skipped, never fatal.** It is caught, recorded, and shown as
  broken in the settings. One person's experiment must not take the household's finances
  offline.

## Plan

- [ ] `server/extensions/` — the manifest shape, the loader, the API handed to `register`
- [ ] Storage in `EXTENSIONS_DIR`, enabled state in `app_setting`
- [ ] Settings: list, enable/disable, remove, upload with an explicit confirmation
- [ ] Dashboard: a section for the cards extensions contribute
- [ ] An example extension and a short guide in `docs/`
- [ ] Copy in both languages, tests for the loader, `npm run check`, 375 px

## Notes / decisions

- The card contract is structured (`rows` of label and value) rather than raw HTML, so an
  extension renders in the app's own design language and a card cannot inject markup into
  a page whose CSP forbids inline script anyway.

## Resume here

Start with the loader and its tests; the settings screen is straightforward once the
runtime exists.

See `docs/WORKFLOW.md` for how this file is used.
