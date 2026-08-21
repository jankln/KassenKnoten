# Current work

**Feature:** F01 – Bootstrap
**Status:** in progress
**Started:** 2026-08-21

## Goal

Turn the repository into a runnable Next.js application skeleton with the full toolchain
in place, so every following feature can be written, checked and committed without any
further setup work. Nothing user-facing yet beyond a placeholder page.

## Scope

- In: Next.js 15 (App Router, TypeScript, strict), Tailwind CSS v4, shadcn/ui setup,
  ESLint + Prettier, Vitest with a first passing test, npm scripts (`dev`, `build`,
  `lint`, `typecheck`, `test`, `check`), `.env.example`, base German document metadata
  and font/theme foundation.
- Out: database, auth, domain logic, real screens — those are F02–F05.

## Plan

- [ ] Scaffold Next.js app (TypeScript, Tailwind, App Router, `@/*` alias)
- [ ] Reconcile scaffold with existing repo files (keep our README, docs, .gitignore)
- [ ] Configure TypeScript strictness and path aliases
- [ ] Add Prettier + ESLint config that agree with each other
- [ ] Add shadcn/ui foundation (components.json, cn util, base theme tokens)
- [ ] Set up Vitest + first domain-style unit test to prove the harness works
- [ ] Add `.env.example` with the variables from docs/PLAN.md section 5
- [ ] Placeholder landing page in German, dark/light aware
- [ ] `npm run check` passes

## Notes / decisions

- Tailwind v4 (CSS-first config via `@theme`) rather than v3, since shadcn/ui supports it
  and it removes the separate `tailwind.config.ts` indirection.
- The scaffold is generated in a scratch directory and copied in, so `create-next-app`
  cannot overwrite README.md, LICENSE, docs/ or .gitignore.

## Resume here

If interrupted: check `git status` for a half-copied scaffold, then run `npm run check`
to see what is missing.
