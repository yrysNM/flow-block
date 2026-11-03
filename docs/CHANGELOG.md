# Changelog

## 0.12.0 — In-app notifications

- Completing a focus session inserts one notification for that user, linked to `/focus`. Completing the same session again does not insert another
- Inserting a recurring task’s successor inserts one notification linked to `/tasks`, in the same transaction as the new task
- `GET /api/notifications` lists the signed-in user’s rows, newest first, with the unread count. Mark one read and mark all read are owner-scoped. A second read keeps the first read time
- The shell shows the unread count and `/notifications` lists the rows. No rows are seeded
- No email, push, or background scheduler

## 0.11.0 — Recurring tasks

- A task stores `NONE`, `DAILY`, or `WEEKLY`. The default is `NONE`
- Completing a daily or weekly task inserts one `TODO` copy one local interval later. Title, description, priority, urgent, important, category, tags, and the recurrence rule are copied. Subtasks are copied open. The deadline and time block move with the interval when they are set
- The completed row stays `COMPLETED`. A second completion does not insert another row. `recurred_from_id` is unique
- List, Kanban, matrix, planner, and dashboard show that next task through the existing queries. Reads do not create future occurrences
- Create and edit on Tasks, Matrix, and Planner set the rule
- A notification inbox was not added

## 0.10.0 — Assistant foundation

- Added a server-side `AssistantProvider` with one method. The session user id is the only user id it receives
- The default provider validates the prompt and returns `{ "status": "not-configured" }`. It does not call the network and does not create a task
- Added `POST /api/assistant`. An empty prompt is rejected. A client `userId` is stripped
- `ASSISTANT_PROVIDER` selects a future provider. Unset, empty, `unconfigured`, and unknown names stay unconfigured and are not required at startup. No API key was added
- Added `/assistant`. Submitting a prompt shows the not-configured state. The page does not invent suggestions or sample tasks
- `FocusService` now imports `PrismaService` as a value so the compiled API can construct it. A type-only import erased the constructor type and the process would not start
- Recurring tasks and a notification inbox stay unbuilt

## 0.9.0 — Production packaging

- Added multi-stage Dockerfiles for the API and the web app. Images do not contain secrets. The web image proxies `/api` with `NUXT_API_PROXY_TARGET`
- Added `infrastructure/docker-compose.prod.yml` for Postgres, the API, and the web app. The dev Postgres file is unchanged
- API responses now send a small set of security headers. HSTS is sent only on HTTPS
- Production boot refuses an empty or placeholder `SESSION_SECRET`. Session token hashes are HMAC-SHA256 with that secret
- Left the AI assistant, recurring tasks, and a notification inbox unbuilt. Redis was not added
- Image builds and `docker compose up` were not run here, because Docker was not installed

## 0.8.0 — Settings and account security

- Display name still updates from Settings. Email is shown and cannot be changed
- `PATCH /api/users/me/password` requires the current password, stores a new argon2id hash, and leaves the session in place. A wrong current password does not write
- Theme `light`, `dark`, and `system` are saved and applied on the web shell
- A default focus duration is saved and used as the initial duration on the focus page. Completing a session still does not change task status
- Language is stored as `en` only. The interface stays English. This is not a translation system
- No notification inbox was added. The AI assistant, recurring tasks, and deployment packaging stay unbuilt

## 0.7.0 — Analytics

- Added `GET /api/analytics` for the last 7 or 30 local days. Every number is computed on the server for the signed-in user
- Tasks completed, focus time with pauses removed, website usage, and habit consistency are defined in `docs/ANALYTICS_METRICS.md`
- The per-day series includes a zero for each day with no rows
- Added `/analytics` with an Apache ECharts trend of tasks and focus minutes, and an empty state when the range has no activity
- Left the AI assistant, notifications, and deployment unbuilt

## 0.6.0 — Habits and goals

- Added owner-scoped habit CRUD. Frequency is daily or weekly, with a target count
- A check-in for a local date updates the existing entry instead of inserting a second row
- The current streak is computed from entry counts. A missed daily day breaks it. Today still open keeps yesterday’s streak
- Added a month calendar of check-ins. Weekly streaks and that calendar use `weekStartsOn`
- Added owner-scoped goals with a deadline, milestones (add, complete, reorder, delete), and links to existing tasks
- Goal progress is `{ completed, total }` from completed milestones and completed linked tasks. No percentage is stored
- The dashboard lists today’s habit check-ins and active goals. There is still no analytics chart

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
