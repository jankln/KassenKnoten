# Current work

**Status:** idle — nothing in flight.

Last finished: **1.3.0 released.** `ghcr.io/jankln/kassenknoten` now carries `1.3.0`,
`1.3` and `latest` on the same manifest, amd64 and arm64, with the receipt scanner in it.
`edge` continues to follow `main`.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: the image is tagged `{{version}}`, `{{major}}.{{minor}}`,
`latest` and `edge` — there is deliberately no `{{major}}` tag, so an instance cannot
follow "1.x, whatever that becomes". Anyone who wants automatic updates today follows
either `latest`, which will one day carry a major version, or `1.3`, which only ever
moves for a patch. Adding a `1` tag is a one-line change to
`.github/workflows/image.yml` if that middle ground turns out to be wanted.

See `docs/WORKFLOW.md` for how this file is used.
