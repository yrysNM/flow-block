# Roadmap

## Done in this repository state

Phase 0: monorepo, design tokens, app shell, Prisma schema (including later models), session auth, docs.

First vertical slice: task CRUD, status rules, quadrant derived from flags, dashboard counts and due-today list, settings for name and time zone.

## Next milestone — Phase 2

Categories, tags, subtasks, and Kanban drag and drop.

That phase should:

- Add category and tag CRUD scoped to the owner
- Add subtasks on the canonical Task
- Add a Kanban board for TODO, IN_PROGRESS, and COMPLETED
- Drag between columns only through the existing status transitions
- Drag between Eisenhower quadrants by writing `isUrgent` and `isImportant`, not a stored quadrant, and without changing status as a side effect
- Keep using `@focusflow/shared-types` for the status union

VueDraggable was intentionally not added yet.

## Later, not scheduled in this change

Focus timer and focus sessions, connecting the existing website blocker to `website_rules`, habits, goals, analytics, extension sync, password reset, and deployment. The concept note grouped Kanban earlier. This repo follows the milestone order above: Kanban is Phase 2.
