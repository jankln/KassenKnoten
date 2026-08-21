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

1. **Before implementation** — fill in the template (see below) and commit it on its own
   (`docs(current-work): start F07 ...`). It is committed _first_, before a single line of
   the feature is written, so an interrupted session always leaves a committed record of
   what was in flight.
2. **During implementation** — tick off steps, add notes about decisions and surprises.
3. **After the feature is committed** — reset the file to the "idle" state so it never
   describes finished work.

Template:

```markdown
# Current work

**Feature:** F07 – Private fixed costs
**Status:** in progress
**Started:** 2026-08-21

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

## No real household data in the repository

The repository must contain **no real figures from the household** — no actual salaries,
balances, rents or member names. Not in code, not in tests, not in documentation, not in
commit messages. The project's own goal is that anyone can self-host it, so this
repository may become public one day, and git history cannot be un-published.

Tests and docs use the example household instead: **Alex and Robin**, 2050 € and 2310 €
net, 1182,35 € of shared costs. Those figures are chosen to exercise the awkward cases
(unequal incomes, a shared total that cannot be halved evenly), so they are a better
regression net than real data anyway.

`Finanzplan.xlsx` and every `*.xlsx` are gitignored. Real numbers belong in the running
instance and in its database — nowhere else.

## Branching

Work is committed directly to `main`. This is a single-maintainer project, and the
one-feature-per-commit rule plus `CURRENT_WORK.md` already provide the traceability that
feature branches would. `main` is expected to stay green: never commit something that does
not typecheck, lint and test cleanly.

## Definition of done for a feature

- Domain logic covered by unit tests where it computes money.
- `npm run typecheck`, `npm run lint`, `npm run test` pass.
- German UI copy reviewed, no English leaking into the interface.
- Works on a 375 px viewport, not only on desktop.
- `docs/PLAN.md` roadmap entry ticked, `CURRENT_WORK.md` reset.
- Committed **and pushed**. Every commit is pushed to `origin/main` right after it is
  made, so the remote never lags behind the local branch.
