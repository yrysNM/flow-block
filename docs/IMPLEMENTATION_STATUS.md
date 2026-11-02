# Implementation status

Phase 4b adds website rules and Chrome extension enforcement on the Phase 4a branch. Habits, goals, and analytics are still schema or docs only. The legacy blocker in `src/` is unchanged.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, board, matrix, planner, focus, blocking, categories, settings, login, register
- `apps/api` NestJS auth, users, tasks, categories, tags, subtasks, matrix, planner, focus sessions, website rules, Swagger
- `apps/extension` sign-in, cached rules, alarms, and blocking
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for Postgres only
- Prisma models listed in the milestone, plus `Session`
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

Habits, goals, analytics, and merging the legacy blocker. Redis was not added. Kanban, the matrix, and the planner use native drag and drop, not VueDraggable. The focus clock in the browser is a display. The API computes elapsed time. The extension enforces from its cache when sync fails.

## Database blocker

`docker` was not installed (`docker --version` failed). `psql` was not installed. The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead.

## Verification

Commands were run from `/workspace` on Node v22.23.4 and npm 10.9.9. `docker` and `psql` are not installed (`command -v` found neither). The integration test did not run. `prisma migrate deploy` was not run. `prisma generate` did succeed, because it does not need a database.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 7 passed
- `@focusflow/shared-schemas`: 6 passed
- `@focusflow/shared-utils`: 13 passed
- `@focusflow/api`: 34 passed, 1 skipped (`test/tasks.integration.test.ts`)

`npm run test -w @focusflow/extension` — 4 passed.

### Typecheck

- `npm run typecheck -w @focusflow/api` — passed
- `npm run typecheck -w @focusflow/web` (`nuxt typecheck`) — passed
- `npm run typecheck -w @focusflow/extension` — passed

### Lint

`npx eslint apps packages` — passed (exit 0).

### Production builds

- `npm run build -w @focusflow/api` — passed (`nest build`)
- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 4.53s)
- `npm run build -w @focusflow/extension` — passed (`node build.mjs`, esbuild bundle)

### Existing extension (preserved)

`npm test` — 4 files, 29 tests passed. `src/` was not modified.

### Not exercised

The signed-in blocking page and the unpacked extension were not clicked through. Creating rules needs Postgres. Headless Chrome hung on `/focus` in the previous milestone; that hang was not investigated here. Service tests cover rule ownership, a duplicate usage event id, and the focus-versus-schedule decision.
