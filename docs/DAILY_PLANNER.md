# Daily planner

The planner is `/planner` on the web and `GET /api/tasks/planner` on the API. It shows one civil day in the user’s time zone.

## What is scheduled

A task has at most one time block: `scheduledStart` and `scheduledEnd` on the Task row. See [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md). Both null means unscheduled.

The timeline is tasks whose `scheduledStart` is inside that local day, ordered by start. The unscheduled list is tasks whose `scheduledStart` is null. A task is not copied into either list. Deadline is a different field. “Due today” on the dashboard is not the timeline.

Each list returns at most 100 tasks. The count is the full total.

## Moves

`PATCH /api/tasks/:id/schedule` writes the two timestamps, or null and null to clear them. It does not write status, urgent, or important. The end has to be after the start, and both instants have to fall on the same local day.

The page can drop a task onto an hour. That snaps the start to the hour and keeps the existing length, or uses one hour when the task had no block. A start time and a length on the unscheduled card do the same thing without drag. If the block would pass local midnight, the page shows an error and does not write.

Creating a task from the planner inserts one unscheduled task. Scheduling it later updates that same id.
