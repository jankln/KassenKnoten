# Current work

**Feature:** F17 – Docker image, compose file, security headers, setup documentation
**Status:** in progress
**Started:** 2026-08-21

## Goal

After this, someone who has never seen this repository can run `docker compose up -d`
with a handful of environment variables and reach a working, hardened instance — a fresh
database migrated and seeded on first request, the session cookie protected by security
headers, and a health check the container runtime can act on.

## Scope

- In: `output: standalone` build, multi-stage `Dockerfile`, `.dockerignore`,
  `docker-compose.yml`, `HEALTHCHECK`, CSP / HSTS / `Referrer-Policy` and friends,
  `.env.example` for a container deployment, README setup and Authentik section.
- Out: OIDC itself (F04b, deferred by request). The README documents what exists today
  and what Authentik will need, without pretending the mode is available.

## Plan

- [ ] `outputFileTracingIncludes` for `db/migrations` — the migrator reads them with a
      path built at runtime, so file tracing cannot see them
- [ ] Dockerfile: build stage with native toolchain for better-sqlite3, runtime stage
      with the standalone output, non-root user, writable `/data`
- [ ] `.dockerignore` so the build context is not the whole working tree
- [ ] Security headers, CSP with a per-request nonce
- [ ] `docker-compose.yml` and `.env.example`
- [ ] README: setup, upgrade, backup, reverse proxy, Authentik
- [ ] Verify: build the standalone output and run it against an empty database
- [ ] `npm run check`

## Notes / decisions

- The Docker daemon is not available in this environment, so the image build itself
  cannot be executed here. Everything the image depends on — the standalone output, the
  migration files reaching the runtime, better-sqlite3 loading, the headers, a cold start
  against an empty database — is verified by running `.next/standalone/server.js`
  directly. The `docker build` remains unrun and must be stated as such.
- CSP: `style-src` cannot use a nonce here. Member colours and bar widths are inline
  `style` attributes, which a nonce does not cover — only `'unsafe-inline'` does, and a
  nonce in the same directive would make browsers ignore it. `script-src` still gets a
  per-request nonce with `'strict-dynamic'`.

## Resume here

Start with `outputFileTracingIncludes`: if the migrations do not reach the image, the
container starts and then fails on its first database access, which is the worst way to
find out.
