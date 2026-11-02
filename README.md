# FocusFlow

Focus on what matters. This repository is the FocusFlow monorepo: a Nuxt web app, a NestJS API, and a Chrome extension shell that will share one account and one Task. PostgreSQL is the system of record.

The original Website Blocker extension and the Expo Android app are still here and still work on their own. They are not wired to the new API yet.

## Run the web app, API, and Postgres

Docker is required for the supported local database. This environment did not have Docker or a Postgres client, so the Compose file is ready but was not started here.

```bash
npm install
docker compose -f infrastructure/docker-compose.yml up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run db:generate
npm exec -w @focusflow/api -- prisma migrate deploy
npm run dev:api
npm run dev:web
```

- Web: http://localhost:3000
- API: http://localhost:3001/api
- OpenAPI: http://localhost:3001/api/docs
- Postgres: `localhost:5432`, database `focusflow`, user `focusflow`, password `focusflow` (local only)

The browser talks to the Nuxt origin at `/api`. Nitro proxies that to the API, which keeps the session cookie on one site. Redis is not used.

## Checks

```bash
bash scripts/check-focusflow.sh
```

That builds the shared packages, generates the Prisma client, lints, typechecks, tests, and production-builds FocusFlow, then runs the existing extension test, typecheck, and lint.

## Layout

```text
apps/web/                 Nuxt 4 task app
apps/api/                 NestJS, Prisma, PostgreSQL
apps/extension/           Chrome MV3 shell, no feature logic
packages/shared-types/    Task status, priority, quadrant rules
packages/shared-schemas/  Zod contracts
packages/shared-utils/    Time-zone day bounds
docs/                     Product and engineering docs
infrastructure/           Docker Compose for Postgres
src/                      Existing Website Blocker extension
mobile/                   Existing Expo Android companion
```

## Existing Website Blocker

Desktop blocking still lives in `src/`. It uses `chrome.storage` and does not call FocusFlow.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` writes an unpacked extension to `dist/`. Load that folder from `chrome://extensions`. `npm run preview` opens the UI gallery at http://127.0.0.1:43147.

## Existing Android app

Phone-level blocking stays in [`mobile/`](mobile/README.md).

```bash
cd mobile
npm install
npm start
```

## Docs

Start with [docs/README.md](docs/README.md), [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md), and [AGENTS.md](AGENTS.md).
