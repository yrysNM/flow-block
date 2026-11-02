# Data models

Shared TypeScript shapes are in `@focusflow/shared-types`. Zod inputs are in `@focusflow/shared-schemas`. Prisma models match those strings for status and priority.

## Task view

Returned by the API. `quadrant` is computed.

- `id`, `title`, `description`
- `status`: `TODO | IN_PROGRESS | COMPLETED`
- `priority`: `LOW | MEDIUM | HIGH | URGENT`
- `isUrgent`, `isImportant`
- `quadrant`: `DO | SCHEDULE | DELEGATE | ELIMINATE`
- `deadline`, `scheduledStart`, `scheduledEnd`, `categoryId`, `completedAt`, `createdAt`, `updatedAt` as ISO strings or null
- `category`: `{ id, name, color }` or null
- `tags`: `{ id, name }[]`
- `subtasks`: `{ id, taskId, title, completed, position }[]`

## Category and tag views

Category: `{ id, name, color, createdAt, updatedAt }`. Tag: `{ id, name, createdAt, updatedAt }`.

## Board

`{ counts: { TODO, IN_PROGRESS, COMPLETED, total }, columns: [{ status, count, tasks }] }`. `count` is the full total for that status under the current filters. `tasks` is the visible page, capped at 100.

## Session response

`{ user: { id, email, name }, preferences: { timezone, theme, weekStartsOn } }`

`theme` is `light | dark | system`. The web UI does not switch themes yet.

## List

`{ data: TaskView[], meta: { page, pageSize, total, pageCount } }`

## Matrix

`{ counts: { DO, SCHEDULE, DELEGATE, ELIMINATE, total }, quadrants: [{ quadrant, count, tasks }] }`. `count` is the full total. `tasks` is capped at 100.

## Planner

`{ date, timezone, timeline: TaskView[], unscheduled: TaskView[], counts: { timeline, unscheduled } }`. Timeline tasks have `scheduledStart` on that local day. Unscheduled tasks have a null `scheduledStart`. A task is in one of those lists, not both.

## Summary

`{ date, timezone, counts: { TODO, IN_PROGRESS, COMPLETED, total }, today: TaskView[] }`

`today` is tasks whose deadline is inside that civil day in the user’s time zone. In-progress tasks without a deadline are not added to that list. Counts include every task the user owns.
