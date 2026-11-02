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

Create writes `userId` from the session. List, get, update, delete, summary, and the board all include that id. A missing row is 404, including when the id belongs to someone else.

Categories, tags, task-tag rows, and subtasks use the same rule. A category or tag id from another user cannot be stored on a task. Deleting a category nulls `categoryId` on that user’s tasks. Deleting a tag removes its `task_tags` rows. Names are unique per user, compared without case before insert.

## Kanban and subtasks

A board move is `updateStatus`. The patch contains `status` and nothing else, so `isUrgent` and `isImportant` stay on their current values and the quadrant does not change unless those flags were already different. Dropping a card on its current column does not write. An illegal transition is rejected before the update.

Toggling, renaming, reordering, or deleting a subtask updates `subtasks` only. It does not call a task update, so status and the Eisenhower flags stay put. Reorder accepts a permutation of that task’s subtask ids and writes `position` from zero.

## Today

`localDayBounds` converts the civil date in the user’s IANA zone to a UTC start inclusive and end exclusive. The summary uses that window on `deadline`.
