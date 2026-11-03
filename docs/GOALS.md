# Goals

A goal belongs to the signed-in user. It is not a task. Linking a task does not copy the task or the goal.

## Fields

Title, optional description, status (`ACTIVE`, `COMPLETED`, or `ARCHIVED`), and an optional deadline. The deadline is the existing `target_date` column, exposed as `deadline` (`YYYY-MM-DD`, stored at UTC midnight). There is no second date column.

Status changes only when the client sends `status`. Reaching a full progress count does not mark the goal completed.

## Milestones

Add, rename, complete, reorder, and delete. `position` starts at 0 and reorder writes a permutation of that goal’s milestone ids, the same rule as subtasks. A foreign goal or milestone is 404.

## Linked tasks

`POST /api/goals/:id/tasks` with `{ taskId }` links a task the same user already owns. Another user’s task is rejected with “Task not found.” Linking the same task again returns the goal and does not insert a second link. `DELETE /api/goals/:id/tasks/:taskId` removes the link and leaves the task in place.

## Progress

`deriveGoalProgress` in `@focusflow/shared-utils` returns `{ completed, total }`.

- `completed` is the number of milestones with `completed: true` plus linked tasks whose status is `COMPLETED`.
- `total` is the number of milestones plus the number of linked tasks.
- `total` 0 means the goal has no milestones or linked tasks yet. The page says “No milestones or tasks yet.”

The API does not accept or store a progress percentage. Completing a milestone changes `progress.completed` on the next read because the milestone row changed, not because a percent column was updated.
