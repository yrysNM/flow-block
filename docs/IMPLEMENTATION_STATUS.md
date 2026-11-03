# Implementation status

Phase 5f adds recurring tasks on the Phase 5e branch. A task stores `NONE`, `DAILY`, or `WEEKLY`. The default is `NONE`. Completing a daily or weekly task inserts one `TODO` successor one local interval later and leaves the original `COMPLETED`. A second completion does not insert another row. A non-recurring completion inserts nothing. List, Kanban, matrix, planner, and dashboard show the successor through the existing task queries. Reads do not create future occurrences. A notification inbox was not added. Redis was not added. The legacy blocker in `src/` is unchanged.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, board, matrix, planner, focus, blocking, categories, habits, goals, analytics, assistant, settings (profile, password, theme, focus default, stored language), login, register. Tasks, Matrix, and Planner set recurrence on create and edit
- `apps/api` NestJS auth, users, password change, tasks (including recurrence), categories, tags, subtasks, matrix, planner, focus sessions, website rules, habits, goals, analytics, the unconfigured assistant, Swagger
- `apps/extension` sign-in, cached rules, alarms, and blocking
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for dev Postgres, and `infrastructure/docker-compose.prod.yml` for Postgres, the API, and the web app
- `apps/api/Dockerfile` and `apps/web/Dockerfile`
- Prisma models listed in the milestone, plus `Session`, plus `recurrence` and unique `recurred_from_id` on tasks
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

A configured assistant model, an API key, a notification inbox, email change, password reset, and merging the legacy blocker. Redis was not added. Kanban, the matrix, and the planner use native drag and drop, not VueDraggable. The focus clock in the browser is a display. The API computes elapsed time, habit streaks, goal progress, and analytics. Apache ECharts is used on `/analytics` only. The extension enforces from its cache when sync fails. Language is stored and is not translated. Production images are defined and were not built here. Recurrence does not send a notification.

## Database blocker

`docker` was not installed (`command -v docker` printed nothing). `psql` was not installed. The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead. `prisma generate` succeeded for the new columns. `prisma migrate deploy` was not run.

## Verification

Commands were run from `/workspace` on Node v22.23.4 and npm 10.9.9. `docker` and `psql` are not installed (`command -v` found neither). The integration test did not run. `prisma migrate deploy` was not run. `docker compose up` was not run. `docker build` was not run.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 7 passed
- `@focusflow/shared-schemas`: 12 passed
- `@focusflow/shared-utils`: 24 passed
- `@focusflow/api`: 58 passed, 1 skipped (`test/tasks.integration.test.ts`)

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
- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 4.06s). The analytics route chunk is still large because it includes ECharts (about 538.49 kB, `v0b62vzp.js`)
- `npm run build -w @focusflow/extension` — passed (`node build.mjs`, esbuild bundle)

The production client bundle includes the recurrence labels “Does not repeat”, “Daily”, and “Weekly”.

### Existing extension (preserved)

`npm test` — 4 files, 29 tests passed. `src/` was not modified.

### Not exercised

The signed-in task form was not submitted in a browser. Creating a session and a task needs Postgres. `docker` and `psql` are not installed, so image builds, `docker compose up`, `prisma migrate deploy`, and the integration test did not run. Headless Chrome `--dump-dom` does not exit here, including on `about:blank`, so it was not used. Service tests cover a daily completion, a second completion, a weekly deadline seven days ahead, and a non-recurring completion.
