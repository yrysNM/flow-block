# FocusFlow agent guide

FocusFlow is an all-in-one productivity product: “Focus on what matters.” Web, Chrome extension, and API share one account and one Task. The canonical workflow is Create Task, Prioritize, Schedule, Focus, Block Distractions, Complete Task, Analyze Results.

Phase 0, the task slice, and Phase 2 are in the tree: auth, one Task, categories, tags, subtasks, and a Kanban board. Do not start the Eisenhower board, focus timer, habits, goals, analytics, or extension blocking unless the task says so.

## Stack

- Web: Nuxt 4, Vue 3 `<script setup>`, TypeScript strict, Tailwind, Pinia. No Vue Query, VueDraggable, or ECharts. Kanban drag uses native HTML5.
- API: NestJS REST, Prisma, PostgreSQL. Zod from `@focusflow/shared-schemas`. No Redis.
- Extension shell: `apps/extension`, Manifest V3, TypeScript, no feature logic yet.
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
- Categories, tags, and subtasks are user-owned and shipped. Habit, goal, focus, notification, and website-rule tables exist for later work. Do not add UI for those yet.
- Kanban drag and the status control change `status` only. They must not change `isUrgent` or `isImportant`. There is no Eisenhower board in this milestone.
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
