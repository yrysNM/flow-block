# Data models

Shared TypeScript shapes are in `@focusflow/shared-types`. Zod inputs are in `@focusflow/shared-schemas`. Prisma models match those strings for status and priority.

## Task view

Returned by the API. `quadrant` is computed.

- `id`, `title`, `description`
- `status`: `TODO | IN_PROGRESS | COMPLETED`
- `priority`: `LOW | MEDIUM | HIGH | URGENT`
- `isUrgent`, `isImportant`
- `quadrant`: `DO | SCHEDULE | DELEGATE | ELIMINATE`
- `deadline`, `categoryId`, `completedAt`, `createdAt`, `updatedAt` as ISO strings or null

## Session response

`{ user: { id, email, name }, preferences: { timezone, theme, weekStartsOn } }`

`theme` is `light | dark | system`. The web UI does not switch themes yet.

## List

`{ data: TaskView[], meta: { page, pageSize, total, pageCount } }`

## Summary

`{ date, timezone, counts: { TODO, IN_PROGRESS, COMPLETED, total }, today: TaskView[] }`

`today` is tasks whose deadline is inside that civil day in the user’s time zone. In-progress tasks without a deadline are not added to that list. Counts include every task the user owns.
