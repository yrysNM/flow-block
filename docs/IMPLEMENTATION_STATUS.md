# Implementation status

Phase 0 and the first task slice are implemented in this branch. Later modules are schema and docs only.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, settings, login, register
- `apps/api` NestJS auth, users, tasks, Swagger
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for Postgres only
- Prisma models listed in the milestone, plus `Session`
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

Kanban, drag and drop, category and tag UI, subtasks UI, focus timer, extension blocking, habits, goals, analytics, sync. Redis was not added.

## Database blocker

`docker` was not installed (`docker --version` failed). `psql` was not installed. The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead.

## Verification

Commands were run from `/workspace` on Node v22.23.4. Results below are from that run. See the commit that added this file if a later edit changes the code; re-run `bash scripts/check-focusflow.sh` after further edits.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 6 passed
- `@focusflow/shared-schemas`: 2 passed
- `@focusflow/shared-utils`: 3 passed
- `@focusflow/api`: 9 passed, 1 skipped (`test/tasks.integration.test.ts`)

### Typecheck

- `npm run typecheck -w @focusflow/api` — passed
- `npm run typecheck -w @focusflow/web` (`nuxt typecheck`) — passed
- `npm run typecheck -w @focusflow/extension` — passed

### Lint

`npx eslint apps packages` — passed (exit 0) after Vue auto-imports were excluded from `no-undef`.

### Production builds

- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 5.5s)
- `npm run build -w @focusflow/api` — passed (`nest build`, `apps/api/dist/main.js`)
- `npm run build -w @focusflow/extension` — passed (`dist/background.js`, `dist/popup.js`)

### Vercel project config

`vercel.json` is a Services project: Nuxt at `apps/web`, Nest at `apps/api` with Express entry `src/vercel-server.mjs`, `/api` rewritten to Nest. The API `postinstall` compiles shared packages, runs `prisma generate` with the `rhel-openssl-3.0.x` engine, copies Linux native binaries, and writes the ESM Nest bundle.

Checked on this branch, Node v22.23.4, from the repo root:

- `npm run postinstall -w @focusflow/api` — passed (Prisma client generated, shared `dist` files written, `apps/api/src/vercel-bundle.mjs` emitted)
- Importing that bundle and the Express entry locally: `GET /api/health` returned `{"status":"ok"}`, `GET /api/tasks` without a cookie returned 401
- `npm test -w @focusflow/api` — 9 passed, 1 skipped

The Vercel production deployment result is recorded after that deploy finishes.

### Existing extension (preserved)

- `npm test` — 4 files, 29 tests passed
- `npm run typecheck` — passed
- `npm run lint` (`oxlint .`) — passed

### Smoke, not a full UI pass

With the built API and the Nitro server running, and Postgres down:

- `GET /api/health` on port 3001 and through port 3000 `/api/health` returned `{"status":"ok"}`
- `GET /api/tasks` without a cookie returned 401 `Authentication required.`
- `POST /api/auth/register` returned 503 `Database is unavailable.`
- Invalid register JSON returned 400 with `details`
- Headless Chrome rendered `http://127.0.0.1:3000/login` (FocusFlow wordmark, email, password, link to register)

Task create and list were not exercised in a browser.
