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

Create writes `userId` from the session. List, get, update, delete, and summary all include that id. A missing row is 404, including when the id belongs to someone else.

## Today

`localDayBounds` converts the civil date in the user’s IANA zone to a UTC start inclusive and end exclusive. The summary uses that window on `deadline`.
