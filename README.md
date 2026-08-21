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

## Development

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

`npm run check` — typecheck, lint, format check and tests — must pass before a commit.
See [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## Running it with Docker

```bash
cp .env.example .env

# a session secret
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# the household password, hashed — paste the printed line into .env
npm run auth:hash

docker compose up -d --build
```

The app is then on `http://127.0.0.1:3000`. Compose deliberately binds to localhost
only, because this is meant to sit behind a reverse proxy that terminates TLS.

Set `APP_URL` to the public HTTPS address before anyone signs in. The session cookie
gets its `Secure` attribute from that value, so an instance reachable over HTTPS but
still configured as `http://localhost:3000` hands out a cookie that a downgrade attack
can read.

The database is created, migrated and seeded on the first request that touches it. There
is no separate migration step, and upgrading is:

```bash
git pull
docker compose up -d --build
```

### Storage and ownership

The container runs as the unprivileged `node` user, and `docker-compose.yml` uses a
named volume, which inherits that ownership from the image. If you replace it with a
bind mount, the host directory belongs to whoever created it and the container will not
be able to write:

```yaml
volumes:
  - /srv/kassenknoten:/data
```

```bash
sudo mkdir -p /srv/kassenknoten
sudo chown 1000:1000 /srv/kassenknoten   # uid of `node` in the image
```

A backup is a copy of the volume, or the JSON export described below. SQLite runs in WAL
mode, so copying only `kassenknoten.db` while the container is running can miss recent
writes — stop the container first, or use the JSON export, which is transactional.

### Reverse proxy

Forward the client address and the original scheme:

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

`X-Forwarded-For` is what login throttling uses to tell clients apart; without it every
attempt looks like it came from the proxy and one wrong password locks out the whole
household. `X-Forwarded-Proto` is how the app knows the browser is on HTTPS, which
decides whether it refreshes the session cookie with `Secure` and sends HSTS.

### Security headers

`proxy.ts` sets them on every response it handles: a Content-Security-Policy with a
per-request nonce for scripts, `frame-ancestors 'none'` and `X-Frame-Options: DENY`,
`Referrer-Policy`, `X-Content-Type-Options`, a `Permissions-Policy` that denies camera,
microphone and location, and HSTS — the last one only when the request arrived over
HTTPS, because pinning a household to a scheme their proxy may not serve cannot be
undone.

If you add a script, a font or an image from another origin, the CSP will block it.
That is the intended behaviour; widen the directive in `proxy.ts` deliberately rather
than reaching for `'unsafe-inline'`.

## Authentication

### Today: one shared household password

`AUTH_MODE=local` is the only supported mode. The password is stored as an argon2id
hash supplied through the environment, so a copy of the SQLite file is not a copy of the
password. Attempts are throttled per client, five per fifteen minutes.

The login identity is not a household member. Members are plain data records with names
and incomes; adding one does not create an account.

### Later: Authentik (OIDC)

Not implemented yet — this is F04b on the roadmap, deferred by request. `AUTH_MODE`
rejects `oidc` on purpose: a configuration value that silently locked the household out
of their own finances would be worse than one that is honestly unsupported.

When it lands it will be the Authorization Code flow with PKCE against an
`OIDC_ISSUER`, the ID token verified against the provider's JWKS, and the e-mail matched
against an allowlist inside the app. In Authentik that means an OAuth2/OpenID provider
with `https://your-host/api/auth/callback` as the redirect URI. The session module
already knows nothing about how an identity was proven, so the callback becomes a second
caller of `startSession()` rather than a rewrite.

If you want Authentik in front of this today, put its proxy provider ahead of the app in
your reverse proxy. The household password stays in place behind it; there is no way yet
to have Authentik replace it.

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

Milestones A to D are complete: the database and calculation engine, authentication, all
the screens that replace the spreadsheet, the dashboard with monthly history, onboarding,
export and backup, and this deployment setup. OIDC (F04b) remains deferred.

- [`docs/PLAN.md`](docs/PLAN.md) — architecture, data model, UX concept, roadmap
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — how changes are made and committed
- [`docs/legacy-spreadsheet.md`](docs/legacy-spreadsheet.md) — what the original spreadsheet did
- [`docs/design.md`](docs/design.md) — the visual direction and why it is what it is
- [`CURRENT_WORK.md`](CURRENT_WORK.md) — what is being worked on right now

## License

MIT — see [LICENSE](LICENSE).
