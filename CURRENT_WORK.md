# Current work

**Status:** idle — nothing in flight.

Last finished: **F25 – Install without a toolchain**. A multi-architecture image is
published to `ghcr.io/jankln/kassenknoten` on every tag, `docker-compose.yml` pulls it, and
the two setup scripts run inside the image — so installing takes two downloaded files, no
checkout, no Node and no build. `docker-compose.build.yml` layers the build back on for
anyone working from source.

Open on `docs/PLAN.md`: **F04b – OIDC against Authentik**, deferred by request.

Note for whoever comes next: the tags are applied by the merge job to the joined manifest,
never by the per-architecture builds — those push by digest only. An architecture that
pushed a tag of its own would be publishing a tag that means "whichever runner finished
last". And `github.repository` cannot be used as an image name directly: it is
`jankln/KassenKnoten`, and a registry reference has to be lowercase.

See `docs/WORKFLOW.md` for how this file is used.
