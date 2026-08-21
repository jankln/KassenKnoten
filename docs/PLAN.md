# KassenKnoten — Project Plan

A self-hosted household finance planner that replaces `Finanzplan.xlsx`.
Single household per instance, no per-person accounts, German UI, strong UX,
runs as one Docker container on a home server.

Status of this document: **agreed baseline**. Changes to it are their own `docs:` commit.

---

## 1. Product goals

1. **Replace the spreadsheet completely.** Everything the sheet does, the app does —
   incomes, private and shared fixed costs, savings pots, per-person breakdown, free cash.
2. **Guided input instead of a grid.** The user is walked through structured forms with
   live validation and an immediate preview of the effect ("dein Anteil: 575,00 €").
   No formula can be broken by a typo.
3. **A dashboard that is worth opening.** Current month at a glance plus the trend over
   time — something the spreadsheet fundamentally cannot show.
4. **Mobile is a first-class target**, not a shrunken desktop. Same feature set, layout and
   interaction patterns designed for touch.
5. **Self-hostable by anyone.** `docker compose up`, a handful of env vars, done.
   Works with or without an identity provider.

Explicit non-goals for v1: multi-household/multi-tenant, bank account sync, individual
transaction bookkeeping, tax features, mobile native apps.

---

## 2. Decisions taken

| Topic          | Decision                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack          | Next.js 16 full-stack (App Router, TypeScript, Turbopack)                                                                                                                 |
| Styling        | Tailwind CSS + shadcn/ui primitives, custom theme                                                                                                                         |
| Animation      | Framer Motion                                                                                                                                                             |
| Data           | SQLite via Drizzle ORM, file on a mounted volume                                                                                                                          |
| Auth           | OIDC (Authentik) as primary, optional local password fallback                                                                                                             |
| Authorization  | E-mail allowlist inside the app                                                                                                                                           |
| Time dimension | Current plan + automatic monthly snapshots for history                                                                                                                    |
| Split modes    | Fixed quota (default 50/50, configurable) and income-proportional; **the split mode is chosen explicitly per shared item**, the household default only pre-fills the form |
| UI language    | German. Code and docs: English                                                                                                                                            |

### Why SQLite

One household, one writer, tiny dataset, and the whole database is a single file that the
user can copy for a backup. Postgres would add a second container for zero benefit here.
Drizzle keeps the door open — the schema is portable if it ever needs Postgres.

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (German UI, responsive, motion)                 │
│  React Server Components + client islands for forms      │
└───────────────┬──────────────────────────────────────────┘
                │ Server Actions (mutations) / RSC (reads)
┌───────────────▼──────────────────────────────────────────┐
│  Next.js server                                          │
│  ├─ proxy.ts             session, allowlist, redirects   │
│  ├─ server/services/*    use cases, transactions         │
│  ├─ lib/domain/*         PURE calculation engine         │
│  └─ db/*                 Drizzle schema + migrations     │
└───────────────┬──────────────────────────────────────────┘
                │
        SQLite file on /data volume
```

Hard rule: **the domain layer is pure.** No database, no framework, no dates from
`Date.now()` passed implicitly. It takes plain objects and returns plain objects, which is
what makes the money math testable to the cent.

### Framework notes (Next.js 16)

Next.js 16 differs from earlier versions in ways that matter here: `middleware.ts` is now
`proxy.ts` and always runs on the Node.js runtime (which suits server-side session
verification), request APIs such as `cookies()`, `headers()`, `params` and `searchParams`
are async-only, and Turbopack is the default for dev and build. Version-matched docs ship
inside `node_modules/next/dist/docs/` — consult them rather than memory.

### Directory layout

```
app/                     routes (dashboard, haushalt, fixkosten, sparen, einstellungen, login)
  (app)/                 authenticated shell
  (auth)/                login + oidc callback
components/
  ui/                    shadcn primitives
  patterns/              MoneyInput, SplitPicker, KpiTile, ProgressRing, DataList
db/
  schema.ts              drizzle tables
  migrations/
lib/
  domain/                calc.ts, split.ts, interval.ts, money.ts   ← pure, unit-tested
  auth/                  oidc.ts, session.ts, allowlist.ts
  i18n/                  de.ts  (all German copy)
  format.ts              Intl-based de-DE money/date/percent formatting
server/
  services/              household.ts, expenses.ts, savings.ts, snapshots.ts
  actions/               server actions, zod-validated
scripts/
  import-excel.ts        one-off seed from Finanzplan.xlsx
docs/
```

### Money and rounding

- All amounts are stored as **integer cents** (`amount_cents`). No floats anywhere near money.
- All percentages are stored as **basis points** (`share_bp`, 5000 = 50 %). Shares of one
  item must sum to exactly 10000.
- Splitting uses the **largest-remainder method**, so per-person shares always sum back to
  the exact total — an odd amount at 47/53 never loses or invents a cent. This is a dedicated,
  heavily tested function; it is the one place where a subtle bug would quietly corrupt
  every number in the app.
- Display formatting is `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.

### Intervals

Every income and expense carries an interval (`monthly`, `quarterly`, `semiannual`,
`yearly`, `custom_months`). The domain layer normalizes to a monthly figure for all
planning views, but keeps the original so the UI can say
"3,00 € / Monat · 36,00 € jährlich abgebucht". This removes the manual division the
spreadsheet forces on the user.

---

## 4. Data model

```
household        id, name, currency, default_split_mode, default_shares(json), onboarding_done, timestamps
member           id, name, color, sort_order, active, timestamps
income           id, member_id, label, kind(salary|other), amount_cents, interval, active
category         id, name, icon, color, is_system
expense          id, scope(private|shared), member_id?, label, category_id, amount_cents,
                 interval, split_mode(fixed_quota|income_ratio|null for private),
                 note, active, timestamps
expense_share    expense_id, member_id, share_bp          -- only for split_mode=fixed_quota
savings_pot      id, name, owner_member_id?(null = shared), monthly_rate_cents,
                 balance_cents, target_cents?, sort_order, note
snapshot         id, period(YYYY-MM), taken_at,
                 income_cents, fixed_private_cents, fixed_shared_cents,
                 savings_rate_cents, savings_balance_cents, free_cash_cents
snapshot_member  snapshot_id, member_id, income_cents, own_fixed_cents,
                 shared_share_cents, remainder_cents
app_setting      key, value(json)      -- misc, e.g. last snapshot run
```

Deletions are soft (`active = false`) so an accidental delete is undoable and historical
snapshots keep referring to real names.

Snapshots are written by a lazy job: on the first request of a new month, the previous
month's computed state is frozen. No cron, no scheduler container.

---

## 5. Auth design

**Today — one shared household password** (F04, built)

- argon2id (OWASP interactive parameters), hash supplied through the environment. The
  password never reaches the database, so a copy of the SQLite file is not a copy of the
  password.
- The hash is read base64-encoded or from a file. An argon2id hash is full of `$`, and
  both `.env` parsers and docker-compose expand those as variables — a raw hash arrives
  as `=19=19456,t=2,p=1`. The app names that failure explicitly instead of saying
  "invalid".
- Attempts are throttled per client (five per fifteen minutes, in-process sliding
  window). A correct password is refused while throttled.
- The session is an **encrypted** cookie (JWE, A256GCM, key derived from
  `SESSION_SECRET` via HKDF), `httpOnly`, `SameSite=Lax`, `Secure` when `APP_URL` is
  HTTPS. It is re-issued once past half its lifetime, so an active household stays signed
  in and an abandoned session still expires.

**Later — OIDC / Authentik** (F04b, deferred by request)

- Authorization Code flow with PKCE, discovery via `OIDC_ISSUER`, ID token verified
  against the JWKS with `jose`, then the e-mail matched against an allowlist.
- The seam already exists: the session module knows nothing about how an identity was
  proven, so the callback becomes a second caller of `startSession()` rather than a
  rewrite. `AUTH_MODE` deliberately rejects `oidc` until that code exists — a config
  value that silently locks the household out would be worse than an unsupported one.

**Everything else**

- `proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts`, and it always runs on the
  Node.js runtime) denies every route except `/login` and `/api/health` without a valid
  session — deny-by-default, not route-by-route opt-in.
- Server Actions re-check the session server-side; the proxy is never the only gate.
- CSRF: `SameSite=Lax` cookie plus the origin check Next performs on Server Actions.
- Security headers (CSP, HSTS, `Referrer-Policy`) land with the deployment work in F17.
- The login identity is not a household member. Members stay pure data records with no
  credentials, exactly as intended.

```env
APP_URL=https://kassen.example.com
DATABASE_PATH=/data/kassenknoten.db
SESSION_SECRET=                 # 32+ random bytes
AUTH_MODE=local
LOCAL_PASSWORD_HASH=            # base64 of the argon2id hash, from npm run auth:hash
LOCAL_PASSWORD_HASH_FILE=       # alternative: read it from a Docker secret
```

---

## 6. UX concept

### Screens

| Route            | Purpose                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `/`              | Dashboard — KPI row, per-person breakdown, category split, trend, savings progress, warnings |
| `/haushalt`      | Members and their income sources                                                             |
| `/fixkosten`     | Fixed costs — segmented into "Privat" per member and "Gemeinsam"                             |
| `/sparen`        | Savings pots with rate, balance, target, progress                                            |
| `/einstellungen` | Default split, categories, snapshots, import/export, appearance                              |
| `/login`         | Authentik button and/or password form                                                        |
| `/willkommen`    | First-run onboarding wizard                                                                  |

### Interaction principles

- **Computed values are never input fields.** The spreadsheet's colour legend becomes
  structure: inputs look like inputs, results look like results.
- **Live preview.** Entering a shared cost shows both members' shares while typing.
- **The split mode is a required, deliberate choice.** The dialog pre-fills the household
  default but the user confirms it per item — a decision, never an assumption.
- **Undo instead of confirm dialogs.** Delete removes it from view immediately with an
  "Rückgängig" toast; nothing is truly gone for good.
- **Empty states teach.** A fresh install shows what to do next, not an empty table.
- **Guard rails.** Negative free cash, savings rate above income, a pot whose target is
  already exceeded — surfaced as calm, informative banners, never as a modal scolding.

### Mobile

Bottom tab navigation, list-of-cards instead of tables, sheets instead of modals,
sticky primary action, a numeric keypad-friendly money input, and swipe gestures for
edit/delete. Layouts are designed at 375 px first and then expanded.

### Motion

Purposeful only: shared-element transitions between list and detail, staggered card entry
on the dashboard, count-up on KPI numbers, spring-based progress rings, optimistic list
reordering. All of it behind `prefers-reduced-motion`.

### Visual direction

Calm, modern, high-contrast. One accent colour per household member used consistently
across every chart and share indicator, so "who pays what" is readable at a glance.
Light and dark theme, system-aware. Typography with a real numeric hierarchy —
tabular figures for all amounts so columns line up.

---

## 7. Roadmap

Each item is one feature and one commit on `main`, preceded by a committed
`CURRENT_WORK.md` describing the intent — see `docs/WORKFLOW.md`.

**Milestone A — Foundation**

- [x] F01 Bootstrap: Next.js + TS + Tailwind + shadcn, ESLint/Prettier, Vitest, npm scripts
- [x] F02 Database layer: Drizzle schema, migrations, SQLite connection, seed of system categories
- [x] F03 Domain engine: money, intervals, income ratio, largest-remainder split, household summary — with full unit tests
- [x] F04 Auth: local password, session cookie, deny-by-default proxy, login screen
- [ ] F04b Auth: OIDC flow against Authentik, e-mail allowlist (deferred by request)

**Milestone B — Replacing the spreadsheet**

- [x] F05 App shell: layout, navigation (desktop sidebar / mobile bottom bar), theming, German copy module, formatting helpers
- [x] F06 Household and members: CRUD, colours, income sources per member
- [x] F07 Categories management
- [x] F08 Private fixed costs: list, create, edit, delete-with-undo, interval handling
- [x] F09 Shared fixed costs: same plus mandatory per-item split mode with live share preview
- [x] F10 Savings pots: rate, balance, target, progress
- [x] F11 Excel import: one-off seed script from `Finanzplan.xlsx`

**Milestone C — Beyond the spreadsheet**

- [x] F12 Dashboard: KPIs, per-person breakdown, category visualization, warnings
- [x] F13 Monthly snapshots and trend charts
- [x] F14 Onboarding wizard and empty states
- [x] F15 Export/backup: JSON and CSV download, restore from JSON

**Milestone D — Ship**

- [ ] F16 Mobile polish, animation pass, accessibility audit
- [ ] F17 Docker image, compose file, `.env.example`, health check, README with setup and Authentik instructions

Milestone A + B means the spreadsheet can be retired. C and D make it something worth
keeping. Ideas parked for later: plan-vs-actual bookkeeping, recurring irregular expenses,
budget envelopes for variable spending, PWA install, multi-currency.

---

## 8. Quality

- **Vitest** for the domain layer — the money math is where correctness actually matters.
  Target: every rounding and split path covered, including zero income, single member,
  and 100/0 splits.
- **Playwright** smoke test for the critical path (login → add shared cost → dashboard
  shows the right shares) once the UI stabilizes in Milestone C.
- `npm run check` = typecheck + lint + test, run before every commit.
- No feature is done while it only works on desktop.
