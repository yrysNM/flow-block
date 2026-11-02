# FocusFlow agent guide

FocusFlow is an all-in-one productivity product: “Focus on what matters.” Web, Chrome extension, and API share one account and one Task. The canonical workflow is Create Task, Prioritize, Schedule, Focus, Block Distractions, Complete Task, Analyze Results.

Phase 0 through Phase 5d are in the tree: auth, one Task, categories, tags, subtasks, Kanban, the Eisenhower matrix, a daily planner, a focus timer, website rules, Chrome extension enforcement, habits, goals, analytics, account settings, and production packaging. Settings cover the display name, a password change that keeps the session, a theme applied on the shell, a default focus duration, and a stored English language. Packaging is the API and web Dockerfiles plus a production-style Compose file. Do not start the AI assistant, recurring tasks, or a notification inbox unless the task says so.

## Stack

- Web: Nuxt 4, Vue 3 `<script setup>`, TypeScript strict, Tailwind, Pinia. Apache ECharts is used on `/analytics` only. No Vue Query or VueDraggable. Kanban drag uses native HTML5.
- API: NestJS REST, Prisma, PostgreSQL. Zod from `@focusflow/shared-schemas`. No Redis.
- Extension: `apps/extension`, Manifest V3. It signs in, caches website rules, and blocks from that cache. The legacy blocker stays in `src/`.
- Shared task status and priority unions live in `@focusflow/shared-types`. Do not copy them.
- The pre-existing Website Blocker (`src/`) and Expo app (`mobile/`) stay as they are until a later sync phase.

## Repository

```text
apps/web apps/api apps/extension
packages/shared-types packages/shared-schemas packages/shared-utils
docs infrastructure scripts
src mobile
```

## Commands

```bash
docker compose -f infrastructure/docker-compose.yml up -d
docker compose -f infrastructure/docker-compose.prod.yml up --build
npm run dev:api
npm run dev:web
bash scripts/check-focusflow.sh
```

Extension-only commands remain `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` at the repo root.

## Architecture rules

- Identity comes from the session cookie. Never trust a client-supplied userId.
- Every task query filters by the authenticated user.
- Task status changes only through an explicit status field. `isUrgent` and `isImportant` do not change status. Quadrant is derived and is not a column.
- Completed tasks reopen to To do. They do not jump to In progress.
- Categories, tags, subtasks, focus sessions, website rules, habits, and goals are user-owned and shipped. Habits are not tasks. Goal progress is derived from milestones and linked tasks and is not stored. Analytics totals are computed on read for the session user. Notification tables still have no inbox and no delivery.
- Account settings are the signed-in user’s row. Email is not editable. Password change requires the current password and does not delete the session. `language` is stored as `en` and is not a translation system. The saved theme is applied on the web shell. The focus page starts from `focusDefaultSeconds`. Completing a session does not change task status.
- One active focus session per user. A second start returns that session and does not insert another. Elapsed time comes from `startedAt`, pause intervals, and `endedAt`. Completing a session does not change task status.
- An active focus session turns block rules on. With no active session, each rule follows its schedule. Allowlist matches are not blocked. The decision lives in `@focusflow/shared-utils`.
- Kanban drag and the status control change `status` only. They must not change `isUrgent` or `isImportant`.
- Matrix drag writes `isUrgent` and `isImportant` only. It must not change status. Quadrant is still derived.
- A task has at most one time block (`scheduledStart` and `scheduledEnd`). Moving that block must not change status or the two flags. Both null means unscheduled, and those tasks stay off the planner timeline.
- No production mock data and no committed secrets. Local Compose credentials belong only in examples.

## Session workflow

Before changing code, read:

1. `AGENTS.md`
2. `.cursor/rules/project.mdc`
3. `docs/CURSOR_CONTEXT.md`
4. `docs/IMPLEMENTATION_STATUS.md`
5. The docs that match the task (API, auth, schema, UI)
6. Then the code

After a task, update `docs/CURSOR_CONTEXT.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/CHANGELOG.md`, `docs/TASKS.md`, and `docs/KNOWN_ISSUES.md` when the facts changed.
