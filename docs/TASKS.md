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
- Eisenhower matrix. Drag and the quadrant menu write `isUrgent` and `isImportant` only
- Daily planner with one block per task. Scheduling updates that task. Unscheduled tasks stay off the timeline
- Focus timer with one active session, presets, custom duration, pause and resume, optional task, and history. Elapsed time comes from timestamps. Completing a session does not change task status
- Website rules and usage events. The FocusFlow extension caches rules, enforces them, and retries usage with the same client event id
- Habit CRUD, check-in that updates the same date, computed streaks, and a month calendar
- Goal CRUD, milestones, links to existing tasks, and progress derived on read
- Unit tests for transitions, quadrant moves, scheduling, ownership, tag attach, subtask toggle, kanban status moves, a second focus start, pause and resume, timestamp elapsed time, website-rule ownership, duplicate usage events, focus-versus-schedule blocking, a duplicate habit check-in, a broken daily streak, goal progress without a stored percentage, and password hashing
- Docs listed in the milestone

## Next, not started

- Analytics dashboard, merging the legacy blocker, Redis, deployment
