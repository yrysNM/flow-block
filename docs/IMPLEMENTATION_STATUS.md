# Implementation status

Phase 3 adds the Eisenhower matrix and a daily planner on the Phase 2 branch. Focus, habits, goals, analytics, and extension blocking are still schema or docs only.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, board, matrix, planner, categories, settings, login, register
- `apps/api` NestJS auth, users, tasks, categories, tags, subtasks, matrix, planner, Swagger
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for Postgres only
- Prisma models listed in the milestone, plus `Session`
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

Focus timer, extension blocking, habits, goals, analytics, sync. Redis was not added. Kanban, the matrix, and the planner use native drag and drop, not VueDraggable.

## Database blocker

`docker` was not installed (`docker --version` failed). `psql` was not installed. The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead.

## Verification

Commands were run from `/workspace` on Node v22.23.4 and npm 10.9.9. `docker` and `psql` are not installed. The integration test did not run. `prisma migrate deploy` was not run. `prisma generate` did succeed, because it does not need a database.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 7 passed
- `@focusflow/shared-schemas`: 4 passed
- `@focusflow/shared-utils`: 3 passed
- `@focusflow/api`: 23 passed, 1 skipped (`test/tasks.integration.test.ts`)

### Typecheck

- `npm run typecheck -w @focusflow/api` — passed
- `npm run typecheck -w @focusflow/web` (`nuxt typecheck`) — passed
- `npm run typecheck -w @focusflow/extension` — passed

### Lint

`npx eslint apps packages` — passed (exit 0).

### Production builds

- `npm run build -w @focusflow/api` — passed (`nest build`)
- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 3.6s)
- `npm run build -w @focusflow/extension` — passed (`tsc`)

### Existing extension (preserved)

`npm test` — 4 files, 29 tests passed. The extension shell was not modified.

### Not exercised

Matrix drag, planner scheduling, and the other signed-in screens were not clicked through in a browser. Those routes need Postgres. Service tests cover the quadrant write, the schedule update, and the split between timeline and unscheduled tasks.
