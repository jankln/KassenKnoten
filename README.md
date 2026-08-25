<div align="center">

<img src="docs/media/logo.svg" alt="" width="88" height="88">

# KassenKnoten

**Zwei Einkommen, ein Haushalt, ein klarer Plan.**

A self-hosted household finance planner for people who share costs unevenly —
and want the maths to be exactly right.

[![License: MIT](https://img.shields.io/badge/License-MIT-e4a249?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/badge/release-v1.0.0--beta.2-008aa3?style=flat-square)](https://github.com/jankln/KassenKnoten/releases)
[![Self-hosted](https://img.shields.io/badge/self--hosted-Docker-b6498d?style=flat-square)](#run-it)
[![UI](https://img.shields.io/badge/UI-Deutsch-008aa3?style=flat-square)](#a-note-on-language)

</div>

<br>

<img src="docs/media/dashboard.png" alt="The overview screen: monthly income, fixed costs, savings rate and free cash, a per-person breakdown, and fixed costs by category.">

<br>

## The problem it solves

Two people earning different amounts share a flat. Rent should be split by income,
the electricity bill down the middle, the insurance is billed once a year, and one of
them pays for a gym the other never uses.

Every tool gets this half right. Splitting apps assume one rule for everything.
Spreadsheets can express it, but one wrong cell and the formula is quietly broken for
months. KassenKnoten makes the split **a deliberate choice per item**, computes it to
the cent, and shows both people what it actually costs them — while they type.

## What it does

**Split each cost its own way.** Fixed quota or proportional to income, chosen per
item, never assumed. The household default only pre-fills the form.

**Get the cents right.** Every amount is stored as integer cents, every share as basis
points, and splits use the largest-remainder method — so 39,99 € at 50/50 becomes
20,00 € and 19,99 €, never 39,98 € or 40,00 €. No floating point touches money anywhere
in the codebase, and the calculation engine is a pure, unit-tested module.

**Keep the past honest.** Every income and fixed cost carries the months it applies to.
Giving someone a raise in September leaves August reporting August, and the dashboard
steps back through the months to show what each one actually was. When an amount changes
the app asks what that means — a new figure from a month on, or a correction to what was
always true — and shows the resulting rows before saving.

**Normalise every interval.** A 132,00 € yearly insurance shows up as 11,00 € a month
next to everything else, without anyone dividing by twelve in their head.

**See the month, and the year.** Income, fixed costs, savings rate and free cash at a
glance, a breakdown per person and per category, and an automatic monthly snapshot that
turns into a trend line over time.

**Save on purpose.** Savings pots with a monthly rate, a balance and an optional target,
owned by one person or by the household.

**Stay out of trouble.** Negative free cash, a savings rate above income, a pot past its
target — surfaced as calm banners, not modal scolding. Deleting shows an "Rückgängig"
toast instead of asking "are you sure?".

**Install it like an app.** From the settings screen, KassenKnoten adds itself to the
home screen or the app list with its own icon and opens without an address bar. Browsers
that cannot install a web app are told where the option lives in their own menu instead.
Nothing about the household is cached on the device — offline, the app says so.

**Own your data.** One SQLite file on a volume you control. Versioned JSON backups and
CSV exports from the settings screen; restoring runs in a single transaction and
validates before it writes anything.

<br>

<table>
<tr>
<td width="62%" valign="top">

<img src="docs/media/shared-costs.png" alt="Shared fixed costs, each row showing both members' shares in euros and percent, and which split rule produced them.">

</td>
<td width="38%" valign="top">

<img src="docs/media/mobile-dark.png" alt="The overview screen on a phone in dark mode.">

</td>
</tr>
<tr>
<td valign="top"><sub>Every shared cost shows who pays what and <em>why</em> — rent by income, electricity down the middle.</sub></td>
<td valign="top"><sub>Designed at 375 px first. Same features, not a shrunken desktop.</sub></td>
</tr>
</table>

<br>

## Run it

You need Docker and about two minutes.

```bash
git clone https://github.com/jankln/KassenKnoten.git
cd KassenKnoten
cp .env.example .env

# a session secret
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# your household password, hashed — paste the printed line into .env
npm run auth:hash

docker compose up -d
```

Open <http://127.0.0.1:3000> and a three-step wizard sets up the household. The database
is created, migrated and seeded on first use — there is no separate migration step, and
upgrading is `git pull && docker compose up -d --build`.

Compose binds to localhost on purpose: put a reverse proxy in front for TLS, forward
`X-Forwarded-Proto` and `X-Forwarded-For`, and set `APP_URL` to the public HTTPS address
before anyone signs in.

## Security

One shared household password, hashed with **argon2id** at OWASP interactive parameters
and supplied through the environment — a copy of the database is not a copy of the
password. Sign-in attempts are throttled per client.

The session is an **encrypted** cookie (JWE, A256GCM, key derived via HKDF), `httpOnly`,
`SameSite=Lax`, and `Secure` whenever the request arrived over HTTPS. Every route except
the login page and the health check is denied without a valid session — deny by default,
so a new page cannot accidentally be public — and server actions re-check server-side.

Every response carries a **Content-Security-Policy with a per-request nonce**, plus
`frame-ancestors 'none'`, `Referrer-Policy`, `X-Content-Type-Options`, a
`Permissions-Policy` denying camera, microphone and location, and HSTS over HTTPS.
Nothing loads from another origin — fonts included.

The container runs as an unprivileged user. Members are plain data records; adding
someone to the household does not create an account.

## Built with

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS · SQLite via Drizzle ORM ·
argon2id · Vitest. No animation library, no CDN, no telemetry, no external calls at
runtime.

## Status

**Beta.** Everything described above works and is in daily use. The interfaces may still
move before 1.0, so read the release notes before upgrading.

Planned: OIDC sign-in against Authentik with an e-mail allowlist. Until it exists,
`AUTH_MODE` refuses the value rather than silently locking a household out of their own
finances.

## A note on language

The interface is **German**, from the first label to the last error message. The code,
the documentation and this README are English, so anyone can run and modify it.

## Contributing

Issues and pull requests are welcome. `docs/PLAN.md` covers the architecture and data
model, `docs/design.md` the visual direction and the reasoning behind it.

`npm run check` — typecheck, lint, format and tests — must pass, and nothing is finished
until it works at 375 px.

## License

MIT — see [LICENSE](LICENSE). Do what you like with it.
