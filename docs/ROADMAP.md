# Roadmap

## Done in this repository state

Phase 0: monorepo, design tokens, app shell, Prisma schema (including later models), session auth, docs.

First vertical slice: task CRUD, status rules, quadrant derived from flags, dashboard counts and due-today list, settings for name and time zone.

Phase 2: owner-scoped categories and tags, task assignment, subtasks, search and status/priority/category filters, and a Kanban board. Dragging a card calls the existing status transition and does not change urgent or important. VueDraggable is still not a dependency. The board uses native drag and drop.

Phase 3: Eisenhower matrix and a one-day planner. Matrix drag writes `isUrgent` and `isImportant` only. The planner stores one block on the task and does not create a second row. Unscheduled tasks stay off the timeline.

## Later, not scheduled in this change

Focus timer and focus sessions, connecting the existing website blocker to `website_rules`, habits, goals, analytics, extension sync, password reset, and deployment. The concept note grouped Kanban earlier. This repo follows the milestone order above: Kanban is Phase 2.
