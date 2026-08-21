# Workflow

How we work on KassenKnoten. This file is binding for every change.

## Language rule

- **Code, comments, identifiers, documentation, commit messages: English.**
- **The product itself (all user-facing UI text, labels, errors, emails): German.**
  German copy lives in a dedicated messages module, never hardcoded across components.

## One feature = one commit

Every feature or change is developed and committed on its own. No mixed commits.

Commit message format (Conventional Commits):

```
feat(fixed-costs): add shared expenses with per-item split mode
docs(plan): record initial project plan
chore(ci): add vitest to test script
```

## Write the intent BEFORE writing the code

Before implementing anything, `CURRENT_WORK.md` at the repo root is filled in with what
is about to change. If work is interrupted at any point — crash, context loss, a week of
silence — that file explains what was in flight and how to resume.

Lifecycle of `CURRENT_WORK.md`:

1. **Before implementation** — fill in the template (see below) and commit it as part of
   the feature's first commit, or as its own `docs:` commit if the feature is large.
2. **During implementation** — tick off steps, add notes about decisions and surprises.
3. **After the feature is committed** — reset the file to the "idle" state so it never
   describes finished work.

Template:

```markdown
# Current work

**Feature:** F07 – Private fixed costs
**Status:** in progress
**Started:** 2026-08-21
**Branch:** feat/f07-private-fixed-costs

## Goal
One paragraph: what the user can do after this that they could not do before.

## Scope
- In: ...
- Out: ...

## Plan
- [ ] Step 1
- [ ] Step 2

## Notes / decisions
- ...

## Resume here
What the next person (or the next session) should do first.
```

Idle state:

```markdown
# Current work

**Status:** idle — nothing in flight.
Next up per `docs/PLAN.md`: F08 – Shared fixed costs.
```

## Branching

Each feature gets a branch `feat/<id>-<slug>` (or `fix/`, `docs/`, `chore/`) and is merged
into `main` when it is complete and the checks below pass.

## Definition of done for a feature

- Domain logic covered by unit tests where it computes money.
- `npm run typecheck`, `npm run lint`, `npm run test` pass.
- German UI copy reviewed, no English leaking into the interface.
- Works on a 375 px viewport, not only on desktop.
- `docs/PLAN.md` roadmap entry ticked, `CURRENT_WORK.md` reset.
