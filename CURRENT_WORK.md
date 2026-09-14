# Current work

**Feature:** Documentation pass and release 1.6.1
**Status:** in progress
**Started:** 2026-09-14

## Goal

Every place that tells somebody how to install, configure or understand KassenKnoten says
what is true today — including the messages the server prints when `.env` is wrong — and
1.6.1 puts the platform work (session-secret script, per-architecture image tests) onto a
tag, so the Windows instructions work with `latest`.

## Scope

- In: `lib/env.ts` startup errors name the command that works in the image, not only
  `npm run` and `openssl`; `.env.example`; the setup scripts' headers.
- In: `docs/PLAN.md` — the UI is English and German, not German; §8 covers the image test
  per architecture; §5's environment block names the secret script.
- In: `docs/WORKFLOW.md` — what CI enforces; `docs/design.md` — copy in two languages.
- In: release 1.6.1 — version, compose pin, README badge, tag, notes with both assets.
- Out: behaviour.

## Plan

- [ ] docs pass, one commit
- [ ] `chore(release): 1.6.1`, build green on both architectures, tag, manifest, notes

## Resume here

Start with `lib/env.ts`'s messages and their tests.
