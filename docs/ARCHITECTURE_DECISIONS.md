# Architecture decisions

## ADR-1. Monorepo beside the existing blocker

The repo already contained a Chrome extension and an Expo app. They still build and test. FocusFlow apps were added under `apps/` and `packages/` instead of rewriting the blocker into the new shell. `apps/extension` is a new MV3 shell with no feature logic, which is what this milestone asked for.

## ADR-2. Prisma 6.19.3

`prisma@latest` resolved to `8.0.0-rc.29`. The API pins Prisma CLI and client to `6.19.3` so generate and the migration diff stay on the current stable client API (`url = env("DATABASE_URL")`, `new PrismaClient()`).

## ADR-3. No Redis

Sessions are Postgres rows. The auth rate limit is a process-local map. A second store would not earn its keep for one API process. Compose starts Postgres only.

## ADR-4. HTTP-only session, same-origin proxy

The token is random. Only its SHA-256 is stored. The web app is `ssr: false` and calls `/api` on its own origin. Nitro proxies to Nest at runtime via `NUXT_API_PROXY_TARGET`. That avoids cross-site cookies during local development.

## ADR-5. Quadrant is not stored

`deriveEisenhowerQuadrant` runs on read and in the form. Status changes go through `assertTaskStatusTransition`. A combined illegal patch throws before any write.

## ADR-6. Zod in one package

Web and API import `@focusflow/shared-schemas`. Nest uses a small `ZodValidationPipe` instead of a second DTO class hierarchy. Swagger is annotated on the controllers for the routes that exist.

## ADR-7. Client-generated UUIDs

Prisma `@default(uuid())` assigns ids in the application. The migration does not add `gen_random_uuid()` defaults. Inserts go through Prisma.

## ADR-8. Shared packages compile to CommonJS

Nest’s build consumes `require`. The Nuxt app aliases the TypeScript source so the browser does not depend on that build.

## ADR-9. One time block on the Task

The schema had a deadline and `task_time_logs`, and no planned start or end. A time log is a record of time already spent, and a task can have many. The planner needs one block per task. Adding `scheduled_start` and `scheduled_end` on `tasks` keeps the plan on the same row the list, board, matrix, and dashboard already use. Both columns null means unscheduled. Setting them updates that row. It does not insert a second task. A block must start and end on the same civil day in the user’s time zone, so it belongs to one planner day. Migration `20261102120000_task_schedule` adds the columns and an owner-plus-start index. `prisma migrate deploy` was not run in the environment that wrote it.

## ADR-10. Focus elapsed time is computed

`focus_sessions` already had `planned_seconds`, `elapsed_seconds`, `started_at`, `ended_at`, and an optional task. Phase 4a reuses that row. Pause is `paused_at` plus `paused_seconds`, not a child table and not `task_time_logs`. `elapsed_seconds` stays at 0. The API computes elapsed and remaining time from the timestamps on each read. A second start returns the active session instead of returning 409 to the client. The partial unique index still makes a racing insert fail, and that failure is turned back into the same active row. Completing the session does not write the task. Migration `20261102130000_focus_pause` was not applied here.
