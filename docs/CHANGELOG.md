# Changelog

## 0.3.0 — Eisenhower matrix and daily planner

- Added a four-quadrant matrix. A move writes `isUrgent` and `isImportant` and does not write status
- Added one optional time block on Task (`scheduled_start`, `scheduled_end`) instead of a second table
- Added a one-day planner. Scheduling updates that task. Unscheduled tasks stay off the timeline. Moving a block does not change status or quadrant
- Left the focus timer, habits, goals, analytics, and extension blocking unbuilt

## 0.2.0 — Categories, tags, subtasks, and Kanban

- Added owner-scoped category and tag CRUD
- Tasks can store one category. Tags attach and detach without trusting a client user id
- Added subtasks with toggle, reorder, and delete. Those writes do not update the parent task
- Task list accepts search plus status, priority, and category filters
- Added a three-column board. A move updates status only and keeps urgent and important
- Left the Eisenhower board, focus timer, habits, goals, analytics, and extension blocking unbuilt

## 0.1.0 — Phase 0 and task slice

- Added the FocusFlow npm workspaces without removing the Website Blocker or the Expo app
- Added Nuxt 4 web shell, NestJS API, Prisma schema, Postgres Compose, and an MV3 extension shell
- Added email and password auth with argon2 and an HTTP-only session cookie
- Added task CRUD, status transitions, derived quadrant, dashboard, and settings
- Documented unfinished modules as unfinished

Verification for this change is recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
