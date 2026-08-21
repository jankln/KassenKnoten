# KassenKnoten

Self-hosted household finance planner — the replacement for a shared `Finanzplan.xlsx`.

One household per instance. Members are plain data records (name, income), not user
accounts. Incomes, private and shared fixed costs, savings pots and the per-person
breakdown are entered through guided, validated forms instead of spreadsheet cells, and
shown on a dashboard that also keeps a monthly history.

- **UI language:** German
- **Code and documentation:** English
- **Runs as:** a single Docker container with a SQLite file on a mounted volume
- **Login:** one shared household password today; OIDC (Authentik) is planned

## Getting started

```bash
npm install
cp .env.example .env.local

# generate the household password hash and paste the printed line into .env.local
npm run auth:hash

# add a session secret
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.local

npm run dev
```

> The password hash is stored base64-encoded on purpose. A raw argon2id hash is full of
> `$` characters, and both `.env` parsers and docker-compose expand those as variables,
> which silently destroys it. `npm run auth:hash` prints the safe form.

Behind a reverse proxy, forward `X-Forwarded-For` so login throttling can tell clients
apart, and serve the app over HTTPS so the session cookie is set with `Secure`.

## Backups and exports

Authenticated users can download a versioned JSON backup from **Einstellungen**. The JSON
contains the complete household plan and monthly history, but never credentials, password
hashes or session data. The same screen offers a UTF-8 CSV export of current incomes,
fixed costs and savings pots for spreadsheets.

Restoring a JSON backup requires an explicit confirmation and replaces the household data
in one database transaction. Seeded system categories are retained; malformed, unsupported
or inconsistent backups are rejected before any data is changed.

## Importing the legacy workbook

The one-off importer reads the documented `Übersicht`, `Fixkosten`, and `Sparen & Rücklagen`
sheets from an operator-supplied `Finanzplan.xlsx`. It validates all rows, keeps money as
integer cents, and is a dry run unless `--apply` is supplied:

```bash
npm run import:excel -- --input Finanzplan.xlsx
npm run import:excel -- --input Finanzplan.xlsx --apply
```

The importer refuses to write into a household that already has active data. Use
`--allow-existing` only after taking a database backup. The workbook is gitignored and must
never be copied into the repository.

## Status

In development. Milestone A (foundation) is complete: database, calculation engine and
authentication. The screens that replace the spreadsheet are next.

- [`docs/PLAN.md`](docs/PLAN.md) — architecture, data model, UX concept, roadmap
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — how changes are made and committed
- [`docs/legacy-spreadsheet.md`](docs/legacy-spreadsheet.md) — what the original spreadsheet did
- [`docs/design.md`](docs/design.md) — the visual direction and why it is what it is
- [`CURRENT_WORK.md`](CURRENT_WORK.md) — what is being worked on right now

## License

MIT — see [LICENSE](LICENSE).
