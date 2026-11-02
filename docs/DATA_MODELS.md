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

`{ user: { id, email, name }, preferences: { timezone, theme, weekStartsOn, focusDefaultSeconds, language } }`

`theme` is `light | dark | system`. The web shell sets `data-theme` from that value. `focusDefaultSeconds` is the focus page’s initial duration. `language` is `en`. It is stored only. The interface stays English.

## List

`{ data: TaskView[], meta: { page, pageSize, total, pageCount } }`

## Matrix

`{ counts: { DO, SCHEDULE, DELEGATE, ELIMINATE, total }, quadrants: [{ quadrant, count, tasks }] }`. `count` is the full total. `tasks` is capped at 100.

## Planner

`{ date, timezone, timeline: TaskView[], unscheduled: TaskView[], counts: { timeline, unscheduled } }`. Timeline tasks have `scheduledStart` on that local day. Unscheduled tasks have a null `scheduledStart`. A task is in one of those lists, not both.

## Focus session

Returned by `/api/focus-sessions`. `elapsedSeconds` and `remainingSeconds` are computed. `serverNow` is the server clock used for that calculation.

- `id`, `taskId`, `plannedSeconds`, `pausedSeconds`, `completed`
- `status`: `RUNNING | PAUSED | COMPLETED | STOPPED`
- `startedAt`, `endedAt`, `pausedAt`, `serverNow`, `createdAt`, `updatedAt` as ISO strings (`endedAt` and `pausedAt` may be null)
- `elapsedSeconds`, `remainingSeconds`
- `task`: `{ id, title, status }` or null

History uses the same page shape as tasks: `{ data, meta }`.

## Website rule

`{ id, domain, mode, enabled, dailyLimitMinutes, scheduleStartMinute, scheduleEndMinute, createdAt, updatedAt }`. `mode` is `BLOCK` or `ALLOW`. Schedule minutes are `0`–`1439` or both null.

Usage totals: `{ date, timezone, totals: [{ ruleId, domain, mode, usedSeconds, dailyLimitMinutes }] }`.

A usage event result is `{ stored, clientEventId, ruleId, domain, usedSeconds }`. `stored: false` means that client event id was already saved.

## Habit

`{ id, name, frequency, targetCount, streak, todayCount, todayMet, createdAt, updatedAt }`. `frequency` is `DAILY` or `WEEKLY`. A detail adds `month` and `entries: [{ id, habitId, date, count, met }]`. A check-in returns `{ entry, habit }`. Streak is computed. See [HABITS.md](HABITS.md).

## Goal

`{ id, title, description, status, deadline, milestones, tasks, progress, createdAt, updatedAt }`. `status` is `ACTIVE | COMPLETED | ARCHIVED`. `deadline` is `YYYY-MM-DD` or null. Milestones are `{ id, goalId, title, completed, position, dueDate }`. Linked tasks are `{ id, title, status }`. `progress` is `{ completed, total }` and is not stored. See [GOALS.md](GOALS.md).

## Analytics

`{ range, timezone, startDate, endDate, tasksCompleted, focusSeconds, websiteUsedSeconds, habitConsistency: { checkIns, expected }, series }`. `range` is `7` or `30`. Each series point is `{ date, tasksCompleted, focusSeconds, websiteUsedSeconds, habitCheckIns, habitExpected }`. See [ANALYTICS_METRICS.md](ANALYTICS_METRICS.md).

## Summary

`{ date, timezone, counts: { TODO, IN_PROGRESS, COMPLETED, total }, today: TaskView[] }`

`today` is tasks whose deadline is inside that civil day in the user’s time zone. In-progress tasks without a deadline are not added to that list. Counts include every task the user owns.
