# Analytics metrics

`GET /api/analytics?range=7` or `range=30` computes every number on the server for the signed-in user. The default range is 7 days. A client `userId` is stripped. Client totals are stripped and are never stored or returned as-is. There is no analytics table.

The range is today plus the previous 6 or 29 dates in the user’s IANA time zone, from preferences. An invalid time zone falls back to UTC. `weekStartsOn` is used only to group weekly habits.

The page `/analytics` charts the series with Apache ECharts. When every day is zero for tasks, focus, website usage, and daily habit check-ins, the chart area is an empty state. The series is never a hardcoded sample.

## Tasks completed

Count of tasks with status `COMPLETED` whose `completedAt` falls on a local date in the range.

Excluded: other users, any status other than `COMPLETED`, a null `completedAt`, and completions outside the range. Reopening a task clears `completedAt`, so that task leaves the count. Subtasks are not tasks.

`completedAt` is an instant. The local date comes from the user’s time zone, not from the UTC calendar date.

## Focus time

Sum of working seconds inside the range. For each local day, a session contributes the wall-clock overlap with that day, minus pauses, floored to whole seconds. The headline total is the sum of those days.

Closed pauses (`pausedSeconds`) have no start time, so they are spread across the session’s wall clock. An open pause runs from `pausedAt` until `endedAt` or the server’s `now`, and only the overlap with that day is removed. The result is never larger than the wall time inside the day.

Excluded: paused time, time outside the range, sessions with a null `startedAt`, and other users. Completing a focus session still does not change task status, so focus time and tasks completed are independent. The stored `elapsed_seconds` column is not read.

The chart shows the same seconds as minutes, rounded to one decimal for the axis. That display value is not a second metric.

## Website usage

Sum of `usedSeconds` on `website_usage` whose `usageDate` is a civil date in the range.

`usageDate` is already the user’s civil date, stored at UTC midnight. It is compared as `YYYY-MM-DD` and is not converted again. Other users and dates outside the range are excluded. The extension cache is not a source. A repeated client event id was stored once when it was recorded, so this total does not add that event twice.

## Habit consistency

`habitConsistency` is `{ checkIns, expected }`: met occurrences versus expected occurrences. It is not a stored percentage.

A daily habit expects one occurrence on each range date on or after the local date it was created. The day is met when that day’s entry `count` is at least `targetCount`. Further check-ins on a met day still count as one occurrence.

A weekly habit expects one occurrence per week, using `weekStartsOn`, when that week contains a range date on or after creation. The week is met when the sum of in-range entry counts in that week is at least `targetCount`. Entries outside the range are not part of the sum.

Days before the habit existed are not expected. Other users’ habits are excluded. The headline adds daily and weekly habits together.

The per-day fields `habitCheckIns` and `habitExpected` count daily habits only. A met weekly habit stays in the headline, so the sum of the daily check-in points can be lower than `habitConsistency.checkIns`.

## Per-day series

`series` has one point for every local date from `startDate` through `endDate`, in order. Each point is `{ date, tasksCompleted, focusSeconds, websiteUsedSeconds, habitCheckIns, habitExpected }`.

A date with no rows is still present, with zeros. It is not omitted. The chart plots `tasksCompleted` and focus minutes from this series.

## Not in this metric set

Goal progress, notifications, an AI summary, and the legacy blocker in `src/` are not part of this response.
