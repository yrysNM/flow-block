# Roadmap

## Done in this repository state

Phase 0: monorepo, design tokens, app shell, Prisma schema (including later models), session auth, docs.

First vertical slice: task CRUD, status rules, quadrant derived from flags, dashboard counts and due-today list, settings for name and time zone.

Phase 2: owner-scoped categories and tags, task assignment, subtasks, search and status/priority/category filters, and a Kanban board. Dragging a card calls the existing status transition and does not change urgent or important. VueDraggable is still not a dependency. The board uses native drag and drop.

Phase 3: Eisenhower matrix and a one-day planner. Matrix drag writes `isUrgent` and `isImportant` only. The planner stores one block on the task and does not create a second row. Unscheduled tasks stay off the timeline.

Phase 4a: focus timer and session history. One active session per user. A second start returns it. Elapsed time is computed from timestamps. Completing a session does not change task status.

Phase 4b: website rules and the FocusFlow extension. Focus mode turns block rules on. Otherwise each rule follows its schedule. The legacy blocker in `src/` is still separate.

Phase 5a: habits and goals. Check-ins update one entry per date. Streaks and goal progress are computed on read.

Phase 5b: analytics. `GET /api/analytics` computes tasks completed, focus time, website usage, habit consistency, and a per-day series. The page uses Apache ECharts. The AI assistant is still later.

Phase 5c: settings and account security. Display name, password change that keeps the session, theme applied on the shell, a default focus duration, and a stored English language. No notification inbox. Email change, password reset, the AI assistant, recurring tasks, and deployment packaging are still later.

## Later, not scheduled in this change

Merging the legacy blocker, the AI assistant, recurring tasks, a notification inbox, password reset, and deployment packaging. The concept note grouped Kanban earlier. This repo follows the milestone order above: Kanban is Phase 2.
