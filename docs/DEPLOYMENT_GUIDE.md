# Deployment guide

Images are defined. They were not built in the environment that added them, because `docker` was not installed. `docker compose up` was not run. Do not treat this file as a record of a live deployment.

Two Compose files:

| File | What it starts |
| --- | --- |
| `infrastructure/docker-compose.yml` | Dev Postgres only, host port 5432 |
| `infrastructure/docker-compose.prod.yml` | Postgres, the API image, and the web image |

There is no Redis. The auth rate limit stays in the API process.

## Dev Postgres

From the repository root:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Stop it:

```bash
docker compose -f infrastructure/docker-compose.yml down
```

The database user, password, and database name are `focusflow`. That password is only for local Docker. The API is still started on the host with `npm run dev:api` after copying `apps/api/.env.example`.

## Images

Build from the repository root so the workspace packages are in the context. No secrets are copied into the images. The API build stage sets a placeholder `DATABASE_URL` only so `prisma generate` can run. The runtime stage does not keep it.

```bash
docker build -f apps/api/Dockerfile -t focusflow-api .
docker build -f apps/web/Dockerfile -t focusflow-web .
```

These two commands were not run here.

The web process keeps the browser on same-origin `/api`. Nitro reads `NUXT_API_PROXY_TARGET` at runtime and proxies there. The production Compose file sets it to `http://api:3001`. Override that variable when the API is not the Compose service named `api`.

The API image entrypoint runs `npx prisma migrate deploy` when `RUN_MIGRATIONS` is `1` (the default), then `node dist/main.js`. Set `RUN_MIGRATIONS=0` to start without migrating.

## Local production-style stack

Generate a session secret of at least 32 characters. The API refuses to boot when `NODE_ENV=production` and `SESSION_SECRET` is empty, shorter than 32 characters, or one of the placeholders listed in [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

```bash
export SESSION_SECRET="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))")"
docker compose -f infrastructure/docker-compose.prod.yml up --build
```

Open `http://localhost:3000`. The web container proxies `/api` to the API container. Postgres is published on host port 5433 so it does not collide with the dev Compose port 5432. The API is on host port 3001.

`COOKIE_SECURE` defaults to `0` in this Compose file so an HTTP cookie on localhost is stored. Behind TLS, start with `COOKIE_SECURE=1`. `Secure` cookies are otherwise on whenever `NODE_ENV=production`.

Stop it:

```bash
docker compose -f infrastructure/docker-compose.prod.yml down
```

Replace `POSTGRES_PASSWORD` outside this machine. Do not reuse `focusflow` for a shared or hosted database. Put TLS on the web origin before treating the stack as public. `WEB_ORIGIN` defaults to `http://localhost:3000`.

## Process layout without Compose

1. Postgres 16. Run `npm run prisma:migrate -w @focusflow/api` (`prisma migrate deploy`)
2. API: `npm run build -w @focusflow/api`, then `node apps/api/dist/main.js` with `NODE_ENV=production`, `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, and a real `SESSION_SECRET`
3. Web: `npm run build -w @focusflow/web`, then `node apps/web/.output/server/index.mjs` with `NUXT_API_PROXY_TARGET` pointing at the API. A static file host alone will not proxy
4. Extension: `npm run build -w @focusflow/extension`, then load `apps/extension`. It has no backend

The in-memory auth rate limit does not span multiple API processes.

The legacy extension build (`npm run build` at the root) is a separate artifact in `dist/`.
