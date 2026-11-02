# Implementation status

Phase 5d adds production packaging on the Phase 5c branch: API and web Dockerfiles, and a Compose file that starts Postgres, the API, and the web app. The dev Postgres Compose file still works. The AI assistant, recurring tasks, and a notification inbox are not in this milestone. Redis was not added. The legacy blocker in `src/` is unchanged.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, board, matrix, planner, focus, blocking, categories, habits, goals, analytics, settings (profile, password, theme, focus default, stored language), login, register
- `apps/api` NestJS auth, users, password change, tasks, categories, tags, subtasks, matrix, planner, focus sessions, website rules, habits, goals, analytics, Swagger
- `apps/extension` sign-in, cached rules, alarms, and blocking
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for dev Postgres, and `infrastructure/docker-compose.prod.yml` for Postgres, the API, and the web app
- `apps/api/Dockerfile` and `apps/web/Dockerfile`
- Prisma models listed in the milestone, plus `Session`
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

The AI assistant, recurring tasks, a notification inbox, email change, password reset, and merging the legacy blocker. Redis was not added. Kanban, the matrix, and the planner use native drag and drop, not VueDraggable. The focus clock in the browser is a display. The API computes elapsed time, habit streaks, goal progress, and analytics. Apache ECharts is used on `/analytics` only. The extension enforces from its cache when sync fails. Language is stored and is not translated. Production images are defined and were not built here.

## Database blocker

`docker` was not installed (`docker --version` failed). `psql` was not installed. The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead.

## Verification

Commands were run from `/workspace` on Node v22.23.4 and npm 10.9.9. `docker` and `psql` are not installed (`command -v` found neither). The integration test did not run. `prisma migrate deploy` was not run. `docker compose up` was not run. `docker build` was not run. `prisma generate` from the earlier settings work still applies. This run did not need a new generate.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 7 passed
- `@focusflow/shared-schemas`: 11 passed
- `@focusflow/shared-utils`: 24 passed
- `@focusflow/api`: 49 passed, 1 skipped (`test/tasks.integration.test.ts`)

`npm run test -w @focusflow/extension` — 4 passed.

### Typecheck

- `npm run typecheck -w @focusflow/api` — passed
- `npm run typecheck -w @focusflow/web` (`nuxt typecheck`) — passed
- `npm run typecheck -w @focusflow/extension` — passed

Shared packages were built first (`npm run build -w @focusflow/shared-types`, `shared-schemas`, and `shared-utils`) so the API typecheck and Nest build read the current workspace packages.

### Lint

`npx eslint apps packages` — passed (exit 0).

### Production builds

- `npm run build -w @focusflow/api` — passed (`nest build`)
- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 4.04s). The analytics route chunk is still large because it includes ECharts (about 538 kB)
- `npm run build -w @focusflow/extension` — passed (`node build.mjs`, esbuild bundle)

The built shell CSS uses `background-color: var(--color-background)`, and `html[data-theme=dark]` replaces that variable. Saving dark or light changes the shell.

### Existing extension (preserved)

`npm test` — 4 files, 29 tests passed. `src/` was not modified.

### Not exercised

The signed-in settings and focus pages were not clicked through. Those writes need Postgres. `docker` and `psql` are not installed, so image builds, `docker compose up`, `prisma migrate deploy`, and the integration test did not run. Headless Chrome `--dump-dom` does not exit here, including on `about:blank`. Service tests cover a wrong current password, a theme round-trip, the focus page’s initial duration, an empty or placeholder production session secret, and the security headers.
