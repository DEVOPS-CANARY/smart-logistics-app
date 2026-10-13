# syntax=docker/dockerfile:1
#
# NestJS backend image.
#
# Build (context is ./backend, so docker/backend.Dockerfile.dockerignore applies):
#   docker build -f docker/backend.Dockerfile -t logistics-backend:dev backend
#
# The same image serves two purposes:
#   app:        node dist/main.js                                (default CMD)
#   migrations: node node_modules/prisma/build/index.js migrate deploy

# Pinned by tag AND digest: the tag documents the version for humans, the digest
# guarantees the exact bytes. Renovate/Dependabot bumps both together.
ARG NODE_IMAGE=node:22.23.3-alpine3.24@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402

# --- base: shared OS layer ----------------------------------------------------
FROM ${NODE_IMAGE} AS base
# Prisma's query engine links against OpenSSL; Alpine does not ship it by default.
RUN apk add --no-cache openssl
WORKDIR /app

# --- build: full toolchain, compiles TypeScript ---------------------------------
FROM base AS build
COPY package.json package-lock.json ./
# npm's download cache lives in a BuildKit cache mount, never in a layer.
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npx prisma generate && npm run build

# --- prod-deps: runtime dependencies only ---------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# --- runtime --------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001

COPY --from=prod-deps /app/node_modules ./node_modules
# Generated Prisma client, plus the Prisma CLI and engines so the migration Job
# can run from this same image (prisma is a devDependency, so prod-deps lacks it).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY package.json ./

# Links the image to its repo in GHCR (visibility, permissions, README).
LABEL org.opencontainers.image.source="https://github.com/princebabou/k8s-devops-lab"

# Files stay owned by root and are only readable by the app user, so a
# compromised process cannot rewrite its own code. Numeric UID:GID (the image's
# `node` user) lets Kubernetes' runAsNonRoot verify the user is not root.
USER 1000:1000

EXPOSE 3001
# exec form: node is PID 1 and receives SIGTERM directly -> enableShutdownHooks()
CMD ["node", "dist/main.js"]
