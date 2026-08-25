# syntax=docker/dockerfile:1
#
# KassenKnoten as a single container.
#
# Published to ghcr.io/jankln/kassenknoten for amd64 and arm64 on every tag; see
# .github/workflows/image.yml. Building it yourself is `docker compose -f docker-compose.yml
# -f docker-compose.build.yml up -d --build`.
#
# Three stages so the runtime image carries neither the npm cache nor a C++ toolchain:
# dependencies, build, and a runtime that receives only Next.js' standalone output.

ARG NODE_IMAGE=node:22-bookworm-slim

# --- dependencies ----------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# better-sqlite3 ships prebuilt binaries for the usual platforms and uses them when it
# can. The toolchain is here for the platforms it does not cover, so an unusual host
# compiles the module instead of failing the build. None of it reaches the runtime image.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# --- build -----------------------------------------------------------------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# BUILD_STANDALONE switches on `output: "standalone"` — see next.config.ts. The build
# needs no secrets: every route that touches configuration is rendered per request.
RUN BUILD_STANDALONE=1 npm run build

# --- runtime ---------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/data/kassenknoten.db

# The database lives on a volume, owned by the unprivileged user the server runs as.
# A named volume inherits this ownership; a bind mount does not — see the README.
# Extensions live in the volume, not in the image: the image is published and immutable,
# so anything written into it disappears on the next pull.
RUN mkdir -p /data/extensions && chown -R node:node /data

# The standalone output is a complete server: its own node_modules, the traced
# db/migrations, and a server.js. Static assets are not included by design and are
# copied in next to it. `public/` is one of them: it carries the service worker and the
# app icons, and without it the image runs fine but cannot be installed as an app —
# the browser asks for /sw.js and /icons/*, gets a 404, and simply never offers.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# The two setup scripts travel with the image.
#
# Whoever pulls this instead of cloning still has to produce an argon2id hash and, if they
# want it, a TOTP secret — and without a checkout there is nothing to run. "Just pull the
# image" would be a promise that breaks at step two.
#
#   docker run -it --rm ghcr.io/jankln/kassenknoten \
#     node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/hash-password.ts
#   ... likewise scripts/totp-secret.ts
#
# Node 22 strips TypeScript types on its own, so these go in as the very files the test
# suite covers rather than as a JavaScript copy that can drift away from them. The
# --disable-warning flag silences one specific notice about the standalone package.json
# having no "type" field; adding that field would break Next's CommonJS server.js. @node-rs/argon2
# is already in the traced standalone output; `uqr` only draws the QR code for the second
# factor and is a devDependency, so it is copied in beside them.
COPY --from=builder --chown=node:node /app/scripts/hash-password.ts ./scripts/hash-password.ts
COPY --from=builder --chown=node:node /app/scripts/totp-secret.ts ./scripts/totp-secret.ts
COPY --from=builder --chown=node:node /app/lib/auth/password.ts ./lib/auth/password.ts
COPY --from=builder --chown=node:node /app/lib/auth/totp.ts ./lib/auth/totp.ts
COPY --from=deps --chown=node:node /app/node_modules/uqr ./node_modules/uqr

USER node
VOLUME ["/data"]
EXPOSE 3000

# Node has fetch built in, so the image needs neither curl nor wget for this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
