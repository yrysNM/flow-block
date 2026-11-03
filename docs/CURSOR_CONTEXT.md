# Cursor context

## Current status

Phase 4b is in the tree on top of the focus timer: website rules and Chrome extension enforcement. The app is still not connected to a running Postgres. Schedule, focus-pause, and website-rule migrations are written and were not applied.

## Completed modules

- Monorepo tooling and design tokens
- User, session, preferences, task API and UI
- Categories, tags, task-tag assignment, and subtasks
- Kanban for TODO, IN_PROGRESS, and COMPLETED, using the same Task rows
- Eisenhower matrix that writes urgent and important only
- Daily planner with one time block stored on the Task
- Focus timer: one active session, presets and a custom duration, pause and resume, optional task, history
- Website rules and usage events, plus FocusFlow extension enforcement from a cached copy
- Derived Eisenhower quadrant and status rules
- Preservation of `src/` and `mobile/`

## In progress

Nothing. This milestone’s code is ready for review. Applying the migration needs Postgres.

## Pending

Habits, goals, and analytics. Those are unimplemented. Website rules and extension sync are in this branch.

## Architecture

Nuxt (client) → Nitro `/api` proxy → Nest → Prisma → PostgreSQL. Shared types and Zod schemas. No Redis. Quadrant is computed. Session cookie `ff_session`.

## Decisions

See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md). Prisma 6.19.3. Sessions in Postgres. Same-origin proxy. CommonJS shared builds for Nest.

## Known bugs

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md). The important one for the next session: integration tests did not run because Docker and Postgres were missing. Service tests did run.

## Database status

Schema, `20261102100000_init`, `20261102120000_task_schedule`, `20261102130000_focus_pause`, and `20261102140000_website_rules` are written. `prisma generate` succeeded. `prisma migrate deploy` did not run. No database was created here.

## API status

Implemented: `/api/health`, `/api/auth/*` including `POST /api/auth/extension/login`, `/api/users/me`, `/api/users/me/preferences`, `/api/tasks` including summary, board, matrix, planner, status, quadrant, schedule, tags, and subtasks, `/api/categories`, `/api/tags`, `/api/focus-sessions`, and `/api/websites` (rules, usage totals, usage events). Swagger at `/api/docs`. Habits, goals, and notifications still have tables only.

## Next recommended tasks

Habits, goals, and analytics. Website rules and the FocusFlow extension are in this branch. The legacy blocker in `src/` is still separate. Headless Chrome hanging on `/focus` is still unfixed.
