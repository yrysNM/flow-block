# Eisenhower matrix

The matrix is `/matrix` on the web and `GET /api/tasks/matrix` on the API. It reads and writes the same Task rows as the list, the board, the dashboard, and the planner.

## Quadrants

The quadrant is not a column. It is derived from `isUrgent` and `isImportant`:

| Urgent | Important | Quadrant | Label |
| --- | --- | --- | --- |
| yes | yes | DO | Do first |
| no | yes | SCHEDULE | Schedule |
| yes | no | DELEGATE | Delegate |
| no | no | ELIMINATE | Eliminate |

Counts come from grouping those two booleans. Each quadrant shows at most 100 tasks. The number on the quadrant is the full count.

## Moves

Drag and drop, and the quadrant menu on each card, call `PATCH /api/tasks/:id/quadrant` with the two booleans for the target. The update does not include `status`. Dropping a card on its current quadrant does not write.

The screen is one column on a phone and a two-by-two grid from the tablet width up. The menu is there so a touch screen can move a task without relying on drag.

## Create and edit

Add opens the task form with the flags for that quadrant. Edit saves through the normal task update, which can change status only when the status field itself changed. Tags and subtasks stay on the task page.
