# Business logic

Implemented in `@focusflow/shared-types` and enforced again in `TasksService`.

## Quadrant

| Urgent | Important | Quadrant |
| --- | --- | --- |
| yes | yes | DO (Do first) |
| no | yes | SCHEDULE |
| yes | no | DELEGATE |
| no | no | ELIMINATE |

Changing the flags updates the quadrant on read. It does not write a new status.

## Status transitions

| From | Allowed next |
| --- | --- |
| TODO | IN_PROGRESS, COMPLETED |
| IN_PROGRESS | TODO, COMPLETED |
| COMPLETED | TODO |

The same status is allowed. COMPLETED to IN_PROGRESS is rejected and the row is not written. A patch that includes both an illegal status and new flags is rejected entirely; the in-memory task is not half-updated.

`completedAt` is set when status becomes COMPLETED and cleared when it leaves COMPLETED.

## Ownership

Create writes `userId` from the session. List, get, update, delete, summary, the board, the matrix, and the planner all include that id. A missing row is 404, including when the id belongs to someone else.

Categories, tags, task-tag rows, and subtasks use the same rule. A category or tag id from another user cannot be stored on a task. Deleting a category nulls `categoryId` on that user’s tasks. Deleting a tag removes its `task_tags` rows. Names are unique per user, compared without case before insert.

## Kanban and subtasks

A board move is `updateStatus`. The patch contains `status` and nothing else, so `isUrgent` and `isImportant` stay on their current values and the quadrant does not change unless those flags were already different. Dropping a card on its current column does not write. An illegal transition is rejected before the update.

Toggling, renaming, reordering, or deleting a subtask updates `subtasks` only. It does not call a task update, so status and the Eisenhower flags stay put. Reorder accepts a permutation of that task’s subtask ids and writes `position` from zero.

## Matrix

`PATCH /tasks/:id/quadrant` writes `isUrgent` and `isImportant` and no other column. Status, the time block, and `completedAt` stay as they were. The quadrant on the response is derived again from the two flags. Dropping a card on its current quadrant does not write.

## Planner

A task has one block. `scheduledStart` and `scheduledEnd` are both set or both null. Null means unscheduled, and the planner timeline query requires `scheduledStart` inside that local day, so unscheduled tasks are only in the unscheduled list. Scheduling calls `updateMany` on the existing id. It does not create a row. The schedule write does not include status, urgent, or important. A block that would end on the next civil day is rejected.

## Focus sessions

One row with `endedAt` null per user. Starting again returns that row. Pause and resume change pause timestamps only. Elapsed time is `floor` of the span from `startedAt` to `endedAt` or now, minus closed and open pauses. Completing or stopping a session writes the focus row and does not write the task. The rules live in `@focusflow/shared-utils` and `FocusService`. See [TIMER_LOGIC.md](TIMER_LOGIC.md).

## Website rules

See [WEBSITE_BLOCKING_LOGIC.md](WEBSITE_BLOCKING_LOGIC.md). Ownership matches the other resources: the session user id is the only owner, and a foreign rule id is 404. A duplicate client usage event id does not increase `usedSeconds`.

## Habits and goals

A habit is not a task. Check-in updates the row for that habit and civil date. The streak walks met days or weeks and stops on a miss. See [HABITS.md](HABITS.md).

Goal progress counts completed milestones and linked tasks with status `COMPLETED`. The service does not write a percentage. See [GOALS.md](GOALS.md).

## Analytics

`GET /api/analytics` reads tasks, focus sessions, website usage, and habit entries for the session user and returns totals plus one point per local day. Definitions, the time zone, and the exclusions are in [ANALYTICS_METRICS.md](ANALYTICS_METRICS.md). A query `userId` is not accepted.

## Today

`localDayBounds` converts the civil date in the user’s IANA zone to a UTC start inclusive and end exclusive. The summary uses that window on `deadline`. The planner uses the same window on `scheduledStart`. A deadline is not a time block.

## Recurrence

`recurrence` is `NONE`, `DAILY`, or `WEEKLY`. Creating a task without the field stores `NONE`. Completing a non-recurring task does not insert a row. Completing a daily or weekly task inserts exactly one `TODO` task when none exists with `recurred_from_id` equal to the completed id. That column is unique. A second completion finds the existing successor and does not insert another. The completed task stays `COMPLETED`, so analytics still count it. The successor copies title, description, priority, urgent, important, category, tags, and the recurrence rule. Each copied subtask starts with `completed` false. Deadline and the time block move by one local day, or seven local days, in the user’s time zone, keeping the local clock time. A null deadline stays null. A null time block stays null. Goal links and focus sessions are not copied. List, board, matrix, planner, and dashboard read the new row with their existing queries. Those reads do not insert future occurrences. Creating a task already set to `COMPLETED` does not insert a successor; the insert happens when status changes to `COMPLETED` or when a completed recurring task is saved and still has no successor.
