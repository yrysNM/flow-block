# Roadmap

## Done in this repository state

Phase 0: monorepo, design tokens, app shell, Prisma schema (including later models), session auth, docs.

First vertical slice: task CRUD, status rules, quadrant derived from flags, dashboard counts and due-today list, settings for name and time zone.

Phase 2: owner-scoped categories and tags, task assignment, subtasks, search and status/priority/category filters, and a Kanban board. Dragging a card calls the existing status transition and does not change urgent or important. VueDraggable is still not a dependency. The board uses native drag and drop.

Phase 3: Eisenhower matrix and a one-day planner. Matrix drag writes `isUrgent` and `isImportant` only. The planner stores one block on the task and does not create a second row. Unscheduled tasks stay off the timeline.

Phase 4a: focus timer and session history. One active session per user. A second start returns it. Elapsed time is computed from timestamps. Completing a session does not change task status.

Phase 4b: website rules and the FocusFlow extension. Focus mode turns block rules on. Otherwise each rule follows its schedule. The legacy blocker in `src/` is still separate.

## Later, not scheduled in this change

Merging the legacy blocker, habits, goals, analytics, password reset, and deployment. The concept note grouped Kanban earlier. This repo follows the milestone order above: Kanban is Phase 2.
