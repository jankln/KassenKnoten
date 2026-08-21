<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KassenKnoten

Self-hosted household finance planner. Read `docs/PLAN.md` before making architectural
decisions and `docs/WORKFLOW.md` before committing.

## Non-negotiables

- **Code, comments and docs in English. All user-facing UI text in German.**
- **Money is integer cents, percentages are basis points.** No floating point arithmetic
  on amounts, ever. Splits use the largest-remainder method so shares sum to the total.
- **`lib/domain/` stays pure**: no database, no framework imports, no ambient clock.
  It is unit-tested; everything else leans on it.
- One feature per commit, with `CURRENT_WORK.md` describing the intent committed first.
- `npm run check` (typecheck + lint + format + test) must pass before every commit.
- Nothing is done until it works at 375 px width.

## Commands

```bash
npm run dev        # dev server (Turbopack)
npm run check      # typecheck + lint + format check + tests
npm run test       # vitest
```
