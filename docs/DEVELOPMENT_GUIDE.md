# Development guide

Requirements: Node 22 (this workspace used 22.23), npm 10. Docker, when you need Postgres.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose -f infrastructure/docker-compose.yml up -d
npm run db:generate
npm exec -w @focusflow/api -- prisma migrate deploy
npm run dev:api
npm run dev:web
```

`dev:api` builds the shared packages and generates Prisma first. Shared TypeScript edits need another `npm run build:packages` before the API process sees them. The web app aliases the source, so it picks shared edits up on its own reload.

Checks:

```bash
bash scripts/check-focusflow.sh
```

Open http://localhost:3000/register. Swagger is http://localhost:3001/api/docs.

If Docker is missing, the API still boots. Register and tasks return 503. Unit tests do not need a database.

The Website Blocker dev server is still `npm run dev` at the repo root. The Expo app is `cd mobile && npm start`.
