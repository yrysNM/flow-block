# Cursor context

## Current status

Phase 4a is in the tree on top of the matrix and planner: a focus timer and session history. The app is still not connected to a running Postgres. `20261102120000_task_schedule` and `20261102130000_focus_pause` are written and were not applied.

## Completed modules

- Monorepo tooling and design tokens
- User, session, preferences, task API and UI
- Categories, tags, task-tag assignment, and subtasks
- Kanban for TODO, IN_PROGRESS, and COMPLETED, using the same Task rows
- Eisenhower matrix that writes urgent and important only
- Daily planner with one time block stored on the Task
- Focus timer: one active session, presets and a custom duration, pause and resume, optional task, history
- Derived Eisenhower quadrant and status rules
- Chrome MV3 shell with no feature logic
- Preservation of `src/` and `mobile/`

## In progress

Nothing. This milestone’s code is ready for review. Applying the migration needs Postgres.

## Pending

Shared website blocking, habits, goals, analytics, and extension sync. Those are unimplemented. Focus sessions are in this branch.

## Architecture

Nuxt (client) → Nitro `/api` proxy → Nest → Prisma → PostgreSQL. Shared types and Zod schemas. No Redis. Quadrant is computed. Session cookie `ff_session`.

## Decisions

See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md). Prisma 6.19.3. Sessions in Postgres. Same-origin proxy. CommonJS shared builds for Nest.

## Known bugs

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md). The important one for the next session: integration tests did not run because Docker and Postgres were missing. Service tests did run.

## Database status

Schema, `20261102100000_init`, `20261102120000_task_schedule`, and `20261102130000_focus_pause` are written. `prisma generate` succeeded. `prisma migrate deploy` did not run. No database was created here.

## API status

Implemented: `/api/health`, `/api/auth/*`, `/api/users/me`, `/api/users/me/preferences`, `/api/tasks` including summary, board, matrix, planner, status, quadrant, schedule, tags, and subtasks, `/api/categories`, `/api/tags`, and `/api/focus-sessions` (active, history, start, pause, resume, complete, stop). Swagger at `/api/docs`. Habits, goals, website rules, and notifications still have tables only.

## Next recommended tasks

Website-rule sync with the existing blocker. The focus timer is in this branch. Elapsed time is computed from timestamps. A second start returns the active session.
