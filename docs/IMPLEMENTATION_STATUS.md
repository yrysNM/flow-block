# Implementation status

Phase 2 is implemented on the Phase 0 branch: categories, tags, subtasks, task filters, and Kanban. Focus, habits, goals, analytics, the Eisenhower board, and extension blocking are still schema or docs only.

## Reused

The repository was not empty. Reused without rewriting:

- Website Blocker extension: `src/`, root Vite config, `manifest.config.ts`, existing Vitest tests
- Expo Android app: `mobile/`

There was no backend, auth, or database to reuse. `apps/extension` is a new shell. It is not a move of the blocker.

## Built

- `apps/web` Nuxt 4 dashboard, tasks, board, categories, settings, login, register
- `apps/api` NestJS auth, users, tasks, categories, tags, subtasks, Swagger
- `packages/shared-types`, `shared-schemas`, `shared-utils`
- `infrastructure/docker-compose.yml` for Postgres only
- Prisma models listed in the milestone, plus `Session`
- Docs in this folder, `AGENTS.md`, and `.cursor/rules`

## Not built

Eisenhower board, focus timer, extension blocking, habits, goals, analytics, sync. Redis was not added. Kanban uses native drag and drop, not VueDraggable.

## Database blocker

`docker` was not installed (`docker --version` failed). `psql` was not installed. The integration test file `apps/api/test/tasks.integration.test.ts` skipped. Service-level tests ran instead.

## Verification

Commands were run from `/workspace` on Node v22.23.4 and npm 10.9.9 for this Phase 2 change. `docker` and `psql` are still not installed. The integration test did not run.

### FocusFlow unit tests

`npm run test:focusflow`

- `@focusflow/shared-types`: 6 passed
- `@focusflow/shared-schemas`: 3 passed
- `@focusflow/shared-utils`: 3 passed
- `@focusflow/api`: 20 passed, 1 skipped (`test/tasks.integration.test.ts`, because `FOCUSFLOW_INTEGRATION` was not set and Postgres is absent)

### Typecheck

- `npm run typecheck -w @focusflow/api` — passed
- `npm run typecheck -w @focusflow/web` (`nuxt typecheck`) — passed
- `npm run typecheck -w @focusflow/extension` — passed

### Lint

`npx eslint apps packages` — passed (exit 0).

### Production builds

- `npm run build -w @focusflow/api` — passed (`nest build`)
- `npm run build -w @focusflow/web` — passed (`nuxt build`, Nitro node-server, about 3.5s)
- `npm run build -w @focusflow/extension` — passed (`tsc`)

### Existing extension (preserved)

`npm test` — 4 files, 29 tests passed. Root `npm run typecheck` and `npm run lint` were not re-run for this change. The extension shell was not modified.

### Not exercised

Register, category create, tag attach, subtask toggle, and a Kanban drop were not clicked through in a browser. Those routes need Postgres, and this environment has no Docker daemon and no `psql`. Service tests cover ownership and the status move without a database.
