# Implementation status

Phase 5g adds in-app notifications on the Phase 5f branch. Completing a focus session inserts one notification for the session user, linked to `/focus`. Inserting a recurring task’s successor inserts one notification linked to `/tasks`, in the same transaction as the new task. A second completion of that session does not insert another notification. Mark read and mark all read use the signed-in user only. The shell shows an unread count and `/notifications` lists the rows. No rows are seeded. Email, push, and a background scheduler were not added. Redis was not added. The legacy blocker in `src/` is unchanged.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, board, matrix, planner, focus, blocking, categories, habits, goals, analytics, assistant, settings (profile, password, theme, focus default, stored language), notifications, login, register. The top bar shows the unread count
- `apps/api` NestJS auth, users, password change, tasks (including recurrence), categories, tags, subtasks, matrix, planner, focus sessions, website rules, habits, goals, analytics, the unconfigured assistant, in-app notifications, Swagger
- `apps/extension` sign-in, cached rules, alarms, and blocking
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for dev Postgres, and `infrastructure/docker-compose.prod.yml` for Postgres, the API, and the web app
- `apps/api/Dockerfile` and `apps/web/Dockerfile`
- Prisma models listed in the milestone, plus `Session`, plus `recurrence` and unique `recurred_from_id` on tasks, plus nullable `link_path` on notifications
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

A configured assistant model, an API key, email, push, a notification scheduler, email change, password reset, and merging the legacy blocker. Redis was not added. Kanban, the matrix, and the planner use native drag and drop, not VueDraggable. The focus clock in the browser is a display. The API computes elapsed time, habit streaks, goal progress, and analytics. Apache ECharts is used on `/analytics` only. The extension enforces from its cache when sync fails. Language is stored and is not translated. Production images are defined and were not built here.

## Database blocker

`docker` was not installed (`command -v docker` printed `docker: missing`). `psql` was not installed (`psql: missing`). The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead. `prisma generate` succeeded for the `link_path` column. `prisma migrate deploy` was not run.

## Verification

Commands were run from `/workspace` on Node v22.23.4 and npm 10.9.9. `docker` and `psql` are not installed (`command -v` found neither). The integration test did not run. `prisma migrate deploy` was not run. `docker compose up` was not run. `docker build` was not run.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 7 passed
- `@focusflow/shared-schemas`: 12 passed
- `@focusflow/shared-utils`: 24 passed
- `@focusflow/api`: 62 passed, 1 skipped (`test/tasks.integration.test.ts`)

`npm run test -w @focusflow/extension` — 4 passed.

### Typecheck

`npm run typecheck:focusflow` — passed. That builds the shared packages, runs `prisma generate`, then typechecks shared-types, shared-schemas, shared-utils, the API, the web app (`nuxt typecheck`), and the extension.

### Lint

`npx eslint apps packages` — passed (exit 0).

### Production builds

- `npm run build -w @focusflow/api` — passed (`nest build`)
- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 4.07s). The analytics route chunk is still large because it includes ECharts (about 538.49 kB, `v0b62vzp.js`)
- `npm run build -w @focusflow/extension` — passed (`node build.mjs`, esbuild bundle)

The production client bundle includes the notifications page (`Mark read`, `Mark all read`) and the notifications store (`/notifications`, `/notifications/:id/read`, `/notifications/read-all`).

### Existing extension (preserved)

`npm test` — 4 files, 29 tests passed. `src/` was not modified.

### Not exercised

The signed-in notifications list was not opened in a browser. Loading that page needs a session, and a session needs Postgres. `docker` and `psql` are not installed, so image builds, `docker compose up`, `prisma migrate deploy`, and the integration test did not run. Headless Chrome `--dump-dom` does not exit here, including on `about:blank`, so it was not used. Service tests cover one notification on focus complete, no second notification for that session, one notification when a successor is inserted, and owner-scoped mark read.
