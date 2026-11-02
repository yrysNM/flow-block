# Tasks

## Done

- Monorepo layout, tooling, Compose file, shared types and Zod schemas
- Prisma schema and initial migration SQL
- Session auth and user preferences
- Task CRUD, summary, and web dashboard, list, and settings
- Unit tests for transitions, quadrant, ownership, and password hashing
- Docs listed in the milestone

## Next milestone — Phase 2

- Category CRUD, owner scoped, and a way to assign one on a task in the UI
- Tag CRUD and task-tag links
- Subtasks on a task, ordered, still owned by the user
- Kanban board with drag and drop that calls the existing status transition rules
- Eisenhower board that writes `isUrgent` and `isImportant` only

## Not this milestone

Focus timer, website-rule sync with the existing blocker, habits, goals, analytics, extension feature logic, Redis, deployment.
