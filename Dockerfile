# syntax=docker/dockerfile:1
#
# KassenKnoten as a single container.
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
RUN mkdir -p /data && chown node:node /data

# The standalone output is a complete server: its own node_modules, the traced
# db/migrations, and a server.js. Static assets are not included by design and are
# copied in next to it.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
VOLUME ["/data"]
EXPOSE 3000

# Node has fetch built in, so the image needs neither curl nor wget for this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
