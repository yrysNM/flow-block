# Implementation status

Phase 5e adds an unconfigured assistant on the Phase 5d branch. `POST /api/assistant` takes the session user and a prompt, validates the prompt, and returns `{ "status": "not-configured" }`. It does not call a model and does not create a task. `ASSISTANT_PROVIDER` is optional and is not required at startup. Recurring tasks and a notification inbox are not in this milestone. Redis was not added. The legacy blocker in `src/` is unchanged.

`FocusService` imported `PrismaService` as a type only. The compiled constructor metadata was `Function`, so `node dist/main.js` could not start. This branch imports it as a value. The other services already did.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, board, matrix, planner, focus, blocking, categories, habits, goals, analytics, assistant, settings (profile, password, theme, focus default, stored language), login, register
- `apps/api` NestJS auth, users, password change, tasks, categories, tags, subtasks, matrix, planner, focus sessions, website rules, habits, goals, analytics, the unconfigured assistant, Swagger
- `apps/extension` sign-in, cached rules, alarms, and blocking
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for dev Postgres, and `infrastructure/docker-compose.prod.yml` for Postgres, the API, and the web app
- `apps/api/Dockerfile` and `apps/web/Dockerfile`
- Prisma models listed in the milestone, plus `Session`
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

A configured assistant model, an API key, recurring tasks, a notification inbox, email change, password reset, and merging the legacy blocker. Redis was not added. Kanban, the matrix, and the planner use native drag and drop, not VueDraggable. The focus clock in the browser is a display. The API computes elapsed time, habit streaks, goal progress, and analytics. Apache ECharts is used on `/analytics` only. The extension enforces from its cache when sync fails. Language is stored and is not translated. Production images are defined and were not built here.

## Database blocker

`docker` was not installed (`command -v docker` printed nothing). `psql` was not installed. The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead.

## Verification

Commands were run from `/workspace` on Node v22.23.4 and npm 10.9.9. `docker` and `psql` are not installed (`command -v` found neither). The integration test did not run. `prisma migrate deploy` was not run. `docker compose up` was not run. `docker build` was not run. `prisma generate` from the earlier settings work still applies. This run did not need a new generate.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 7 passed
- `@focusflow/shared-schemas`: 12 passed
- `@focusflow/shared-utils`: 24 passed
- `@focusflow/api`: 54 passed, 1 skipped (`test/tasks.integration.test.ts`)

`npm run test -w @focusflow/extension` — 4 passed.

The focus and assistant service tests were run again after the `PrismaService` import change. Both files passed.

### Typecheck

- `npm run typecheck -w @focusflow/api` — passed, including a second run after the `FocusService` import change
- `npm run typecheck -w @focusflow/web` (`nuxt typecheck`) — passed
- `npm run typecheck -w @focusflow/extension` — passed

Shared packages were built first (`npm run build -w @focusflow/shared-types`, `shared-schemas`, and `shared-utils`) so the API typecheck and Nest build read the current workspace packages.

### Lint

`npx eslint apps packages` — passed (exit 0).

### Production builds

- `npm run build -w @focusflow/api` — passed (`nest build`), then again after the `FocusService` import change
- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 4.09s). The analytics route chunk is still large because it includes ECharts (about 538.49 kB, `v0b62vzp.js`). The assistant page is its own client chunk
- `npm run build -w @focusflow/extension` — passed (`node build.mjs`, esbuild bundle)

The built shell CSS uses `background-color: var(--color-background)`, and `html[data-theme=dark]` replaces that variable. Saving dark or light changes the shell.

### Existing extension (preserved)

`npm test` — 4 files, 29 tests passed. `src/` was not modified.

### Not exercised

The signed-in assistant submit was not clicked through. Creating a session needs Postgres. `docker` and `psql` are not installed, so image builds, `docker compose up`, `prisma migrate deploy`, and the integration test did not run. Headless Chrome `--dump-dom` does not exit here, including on `about:blank`, so it was not used.

`node dist/main.js` did start with `NODE_ENV=development`. `GET /api/health` returned 200. `POST /api/assistant` without a session returned 401 `Authentication required.` for both a normal prompt and a blank prompt. The production web build served `GET /assistant` as HTTP 200. That response is the client shell (`ssr: false`); the form is behind the login redirect once the page hydrates. The built assistant chunk posts to `/assistant` and renders the not-configured copy only from the response status.
