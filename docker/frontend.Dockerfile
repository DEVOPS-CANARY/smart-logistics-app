# syntax=docker/dockerfile:1
#
# Next.js frontend image (standalone output).
#
# Build (context is ./frontend, so docker/frontend.Dockerfile.dockerignore applies):
#   docker build -f docker/frontend.Dockerfile -t logistics-frontend:dev frontend
#
# The default API base "/api" makes the image environment-agnostic: the browser
# calls its own origin and the Ingress routes /api to the backend. Only local
# setups without an Ingress (docker compose) override it at build time.

# Same pinned base as the backend image.
ARG NODE_IMAGE=node:22.23.3-alpine3.24@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402

# --- build ------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# npm's download cache lives in a BuildKit cache mount, never in a layer.
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
# Inlined into the browser bundle by `next build`; see src/lib/api-base.ts.
ARG NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN npm run build

# --- runtime ------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Kubernetes sets HOSTNAME to the pod name; Next's server.js binds to it,
    # which would make the pod unreachable on other interfaces. Bind to all.
    HOSTNAME=0.0.0.0

# Standalone server + its traced node_modules, then the static assets that
# standalone deliberately leaves out. No public/ folder exists in this app.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Code stays root-owned and read-only for the app user. Only Next's cache dir
# is writable (mount an emptyDir here when readOnlyRootFilesystem is on).
RUN mkdir -p .next/cache && chown 1000:1000 .next/cache

# Links the image to its repo in GHCR (visibility, permissions, README).
LABEL org.opencontainers.image.source="https://github.com/princebabou/k8s-devops-lab"

# Numeric UID:GID (the image's `node` user) lets Kubernetes' runAsNonRoot
# verify the user is not root.
USER 1000:1000

EXPOSE 3000
# exec form: node is PID 1 and receives SIGTERM directly.
CMD ["node", "server.js"]
