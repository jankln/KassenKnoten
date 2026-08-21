# KassenKnoten

Self-hosted household finance planner — the replacement for a shared `Finanzplan.xlsx`.

One household per instance. Members are plain data records (name, income), not user
accounts. Incomes, private and shared fixed costs, savings pots and the per-person
breakdown are entered through guided, validated forms instead of spreadsheet cells, and
shown on a dashboard that also keeps a monthly history.

- **UI language:** German
- **Code and documentation:** English
- **Runs as:** a single Docker container with a SQLite file on a mounted volume
- **Login:** OIDC (e.g. Authentik) with an optional local password fallback

## Status

Planning complete, implementation not started.

- [`docs/PLAN.md`](docs/PLAN.md) — architecture, data model, UX concept, roadmap
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — how changes are made and committed
- [`docs/legacy-spreadsheet.md`](docs/legacy-spreadsheet.md) — what the original spreadsheet did
- [`CURRENT_WORK.md`](CURRENT_WORK.md) — what is being worked on right now

## License

MIT — see [LICENSE](LICENSE).
