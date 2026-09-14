# Current work

**Feature:** Runs anywhere Docker runs — proven per architecture, documented for Windows
**Status:** in progress
**Started:** 2026-09-14

## Goal

Somebody with a Linux server (x86 or ARM), a Raspberry Pi, a Mac or a Windows PC can install
KassenKnoten from the README without translating commands, and every published image has
been started and used on the architecture it is for before it ships.

## Scope

- In: CI — each architecture's build job starts the image it just built and runs the
  Playwright smoke test against the running container, on a native amd64 and a native arm64
  runner, before the manifest is published. The smoke test also reads a receipt through
  the API, since the scanner is the part that once worked everywhere but in the image.
- In: `playwright.config.ts` — `E2E_BASE_URL` points the test at a running instance
  instead of starting the standalone server.
- In: `scripts/session-secret.ts` in the image, so a session secret needs Docker rather
  than `openssl`, on any system.
- In: README and both landing pages — where it runs, and the setup for Windows in
  PowerShell next to the one for Linux and macOS.
- Out: 32-bit ARM (`linux/arm/v7`). No native runner exists for it; building it under
  emulation is a separate decision.
- Out: running without Docker on Windows.

## Plan

- [ ] `session-secret.ts`, copied into the image
- [ ] `E2E_BASE_URL` in the Playwright config; receipt step in the smoke test
- [ ] image test steps in `image.yml`'s build job
- [ ] README: "Where it runs", setup tabs for Linux/macOS and Windows
- [ ] landing pages: the same
- [ ] local: smoke test against the standalone server still green; push and watch both
      architectures run the test against their image

## Notes / decisions

- Windows runs the same Linux image, through Docker Desktop and WSL 2 — amd64 on Intel and
  AMD, arm64 on Windows on ARM. What differs is only the shell, so the Windows instructions
  are the Linux ones in PowerShell, not a second build.
- No Windows machine is available here: the PowerShell commands are written with care but
  not run on Windows. That has to be said where they are handed over.

## Resume here

Start with `scripts/session-secret.ts`.
