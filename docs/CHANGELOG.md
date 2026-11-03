# Changelog

## 0.5.0 — Website rules and extension enforcement

- Added owner-scoped website rules: blocklist, allowlist, optional daily limit, and optional schedule window
- Added usage events. A repeated client event id is stored once and does not add time again
- While a focus session is active, block rules are on. Otherwise each rule follows its schedule
- The FocusFlow extension signs in without embedded secrets, caches rules, enforces offline, queues usage, and resyncs with `chrome.alarms`
- Added a Blocking page for rules and today’s totals
- Left habits, goals, analytics, and the legacy `src/` blocker unmerged

## 0.4.0 — Focus timer and session history

- Added one active focus session per user. A second start returns that session and does not insert another
- Added 15, 25, and 50 minute presets, a custom duration, pause, resume, complete, and stop
- Elapsed and remaining time are computed from server timestamps. The stored `elapsed_seconds` column is not the source of truth
- A session can point at an existing task. Completing or stopping it does not change that task’s status
- Added a Focus page in the app shell and a history list for the signed-in user
- Left website blocking, habits, goals, analytics, and extension feature logic unbuilt

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
