# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Single-image build: compiles the client and server, then runs the Express
# server which also serves the built client. This is the simplest deploy —
# one container hosting both API and frontend. (See docker-compose.yml to run
# it alongside Postgres.)
# ---------------------------------------------------------------------------

FROM node:20-slim AS build
WORKDIR /app

# Install all workspace deps (root + client + server) using the lockfile.
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci

# Copy sources and build both workspaces.
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only the artifacts needed at runtime: server dist, built client, and the
# production node_modules.
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --omit=dev

COPY --from=build /app/server/dist ./server/dist
# The compiled migrate.js reads schema.sql from its own directory.
COPY --from=build /app/server/src/db/schema.sql ./server/dist/db/schema.sql
COPY --from=build /app/client/dist ./client/dist

EXPOSE 4000
# Migrations are run separately (see README / compose). Start the server.
CMD ["node", "server/dist/index.js"]
