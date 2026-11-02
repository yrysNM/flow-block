# Tasks

## Done

- Monorepo layout, tooling, Compose file, shared types and Zod schemas
- Prisma schema and initial migration SQL
- Session auth and user preferences
- Task CRUD, summary, and web dashboard, list, and settings
- Category CRUD and assigning one category on a task
- Tag CRUD, plus attach, detach, and list on a task
- Subtasks: add, toggle, reorder, delete
- Task search and status, priority, and category filters
- Kanban board with counts. Drag and drop and the card menu call the existing status transition and leave urgent and important unchanged
- Unit tests for transitions, quadrant, ownership, tag attach, subtask toggle, kanban status moves, and password hashing
- Docs listed in the milestone

## Next, not started

- Eisenhower board that writes `isUrgent` and `isImportant` only, and does not change status
- Focus timer, website-rule sync with the existing blocker, habits, goals, analytics, extension feature logic, Redis, deployment
