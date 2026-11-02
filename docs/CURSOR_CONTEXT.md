# Cursor context

## Current status

Phase 5f is in the tree on top of the assistant seam: a task may recur daily, weekly, or not at all. Completing a recurring task inserts one next open task and leaves the original completed. The app is still not connected to a running Postgres. Schedule, focus-pause, website-rule, habits-goals, account-preference, and task-recurrence migrations are written and were not applied. Image builds were not run.

## Completed modules

- Monorepo tooling and design tokens
- User, session, preferences, task API and UI
- Categories, tags, task-tag assignment, and subtasks
- Kanban for TODO, IN_PROGRESS, and COMPLETED, using the same Task rows
- Eisenhower matrix that writes urgent and important only
- Daily planner with one time block stored on the Task
- Focus timer: one active session, presets and a custom duration, pause and resume, optional task, history
- Website rules and usage events, plus FocusFlow extension enforcement from a cached copy
- Habits with a target count, check-ins that update one entry per date, a computed streak, and a month calendar
- Goals with a deadline, milestones, links to existing tasks, and progress derived on read
- Analytics for the last 7 or 30 local days, with a per-day series and an ECharts page
- Account settings: display name, password change that keeps the session, theme applied on the shell, default focus duration, and stored English
- Production Dockerfiles for the API and web app, and a Compose file for Postgres, the API, and the web app
- Assistant seam: `AssistantProvider`, an unconfigured default, `POST /api/assistant`, and `/assistant`
- Recurring tasks stored on the task. Completion inserts one successor. Reads do not generate future rows
- Derived Eisenhower quadrant and status rules
- Preservation of `src/` and `mobile/`

## In progress

Nothing. This milestone’s code is ready for review. Applying the migration needs Postgres.

## Pending

A configured assistant provider and a notification inbox. Recurring tasks, the assistant foundation, settings, analytics, and production packaging are in this branch. Email change and password reset are not. Language is stored and is not translated. Image builds were not run. `ASSISTANT_PROVIDER` is optional and is not required at startup.

## Architecture

Nuxt (client) → Nitro `/api` proxy → Nest → Prisma → PostgreSQL. Shared types and Zod schemas. No Redis. Quadrant is computed. Session cookie `ff_session`.

## Decisions

See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md). Prisma 6.19.3. Sessions in Postgres. Same-origin proxy. CommonJS shared builds for Nest.

## Known bugs

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md). The important one for the next session: integration tests did not run because Docker and Postgres were missing. Service tests did run. Headless Chrome `--dump-dom` does not exit in this environment, including on `about:blank`.

## Database status

Schema, `20261102100000_init`, `20261102120000_task_schedule`, `20261102130000_focus_pause`, `20261102140000_website_rules`, `20261102150000_habits_goals`, `20261102160000_account_preferences`, and `20261102170000_task_recurrence` are written. `prisma generate` succeeded. `prisma migrate deploy` did not run. No database was created here.

## API status

Implemented: `/api/health`, `/api/auth/*` including `POST /api/auth/extension/login`, `/api/users/me`, `/api/users/me/password`, `/api/users/me/preferences`, `/api/tasks` including summary, board, matrix, planner, status, quadrant, schedule, tags, subtasks, and recurrence, `/api/categories`, `/api/tags`, `/api/focus-sessions`, `/api/websites` (rules, usage totals, usage events), `/api/habits` (including check-ins), `/api/goals` (milestones, reorder, and task links), `GET /api/analytics`, and `POST /api/assistant`. Swagger at `/api/docs` is version 0.11.0. Completing a daily or weekly task inserts one next open task. The assistant returns not-configured until a provider is selected. Notifications still have tables only. There is no inbox. Production boot checks `SESSION_SECRET` and does not require `ASSISTANT_PROVIDER`.

## Next recommended tasks

A provider that calls a model, and a notification inbox. The legacy blocker in `src/` is still separate. Headless Chrome on `/focus` is recorded in [KNOWN_ISSUES.md](KNOWN_ISSUES.md). Image builds still need a machine with Docker.
