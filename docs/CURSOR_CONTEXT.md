# Cursor context

## Current status

Phase 2 is in the tree on top of auth and tasks: categories, tags, subtasks, list filters, and Kanban. The app is still not connected to a running Postgres in the environment that built it. The Eisenhower board was not part of this milestone.

## Completed modules

- Monorepo tooling and design tokens
- User, session, preferences, task API and UI
- Categories, tags, task-tag assignment, and subtasks
- Kanban for TODO, IN_PROGRESS, and COMPLETED, using the same Task rows
- Derived Eisenhower quadrant and status rules
- Chrome MV3 shell with no feature logic
- Preservation of `src/` and `mobile/`

## In progress

Nothing. This milestone’s code is ready for review. Applying the migration needs Postgres.

## Pending

Eisenhower quadrant drag, focus sessions, shared website blocking, habits, goals, analytics, and extension sync. All of those are unimplemented.

## Architecture

Nuxt (client) → Nitro `/api` proxy → Nest → Prisma → PostgreSQL. Shared types and Zod schemas. No Redis. Quadrant is computed. Session cookie `ff_session`.

## Decisions

See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md). Prisma 6.19.3. Sessions in Postgres. Same-origin proxy. CommonJS shared builds for Nest.

## Known bugs

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md). The important one for the next session: integration tests did not run because Docker and Postgres were missing. Service tests did run.

## Database status

Schema and `20261102100000_init` migration are written. `prisma generate` succeeded. `prisma migrate deploy` did not run. No database was created here.

## API status

Implemented: `/api/health`, `/api/auth/*`, `/api/users/me`, `/api/users/me/preferences`, `/api/tasks` including summary, board, status, tags, and subtasks, `/api/categories`, and `/api/tags`. Swagger at `/api/docs`. Focus, habits, goals, website rules, and notifications still have tables only.

## Next recommended tasks

Eisenhower board that writes only `isUrgent` and `isImportant`, then focus sessions.
