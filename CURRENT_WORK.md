# Current work

**Status:** idle — nothing in flight.

Last finished: **1.3.1 released.** `latest`, `1.3` and `1.3.1` are one manifest on amd64
and arm64, carrying the receipt scanner and the fix that makes it findable. `1.3.0` still
points at the release before it, and `edge` follows `main`.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: the image is tagged `{{version}}`, `{{major}}.{{minor}}`,
`latest` and `edge` — there is deliberately no `{{major}}` tag, so an instance cannot
follow "1.x, whatever that becomes". Anyone wanting automatic updates today follows
`latest`, which will one day carry a major version, or `1.3`, which only moves for a
patch. Adding a `1` tag is a one-line change to `.github/workflows/image.yml`.

See `docs/WORKFLOW.md` for how this file is used.
