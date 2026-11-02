# API documentation

Base path `/api`. Interactive docs: `/api/docs` (Swagger). Cookie name in OpenAPI: `ff_session`.

Error body:

```json
{ "statusCode": 400, "error": "Bad Request", "message": "Validation failed", "details": [{ "path": "email", "message": "..." }] }
```

## Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | `{ "status": "ok" }`. No database |
| POST | `/api/auth/register` | 201 and session cookie. Body: email, password, name |
| POST | `/api/auth/login` | 200 and session cookie |
| POST | `/api/auth/logout` | 204. Clears the cookie even when the token is already gone |

## Session required

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/auth/me` | User and preferences |
| GET | `/api/users/me` | Same shape |
| PATCH | `/api/users/me` | `{ "name" }` |
| PATCH | `/api/users/me/preferences` | timezone, theme, and/or weekStartsOn |
| GET | `/api/tasks` | `q`, `status`, `priority`, `categoryId` (uuid or `none`), `sort` (`createdAt`, `updatedAt`, `deadline`, `priority`, `title`), `order`, `page`, `pageSize` (max 100). A blank `q` is ignored |
| GET | `/api/tasks/summary` | Optional `date=YYYY-MM-DD`. Defaults to today in the user time zone |
| GET | `/api/tasks/board` | Same search, priority, and category filters. No status filter. Counts are totals. Each column returns at most 100 tasks, newest update first |
| GET | `/api/tasks/matrix` | Same filters as the board. Four quadrants from `isUrgent` and `isImportant`. Counts are totals. Each quadrant returns at most 100 tasks |
| GET | `/api/tasks/planner` | Optional `date=YYYY-MM-DD` in the user time zone. `timeline` is tasks whose `scheduledStart` falls on that day. `unscheduled` is tasks with a null start. Each list is capped at 100. `counts` are the full totals |
| GET | `/api/tasks/:id` | 404 if not owned |
| POST | `/api/tasks` | 201 |
| PATCH | `/api/tasks/:id` | At least one field |
| PATCH | `/api/tasks/:id/status` | `{ "status" }`. Writes status only in meaning: urgent and important stay as they are |
| PATCH | `/api/tasks/:id/quadrant` | `{ "isUrgent", "isImportant" }`. Writes those two fields only. Status is not in the update |
| PATCH | `/api/tasks/:id/schedule` | `{ "scheduledStart", "scheduledEnd" }`. Both ISO datetimes, or both null to clear. Writes the block only. End must be after start and on the same local day |
| DELETE | `/api/tasks/:id` | 204 |
| GET | `/api/categories` | Owner’s categories, name order |
| POST | `/api/categories` | 201. `{ "name", "color"? }`. Color is `#RRGGBB` or null. Duplicate name is 409 |
| PATCH | `/api/categories/:id` | Name and/or color. 404 if not owned |
| DELETE | `/api/categories/:id` | 204. Tasks remain and `categoryId` becomes null |
| GET | `/api/tags` | Owner’s tags |
| POST | `/api/tags` | 201. `{ "name" }`. Duplicate name is 409 |
| PATCH | `/api/tags/:id` | `{ "name" }` |
| DELETE | `/api/tags/:id` | 204. Assignments go with the tag |
| POST | `/api/tasks/:id/tags` | `{ "tagId" }`. Task and tag must belong to the session user. Attaching the same tag again returns the task |
| DELETE | `/api/tasks/:id/tags/:tagId` | Detach. Returns the task |
| POST | `/api/tasks/:id/subtasks` | 201. `{ "title" }`. Position is one past the current max |
| PATCH | `/api/tasks/:id/subtasks/reorder` | `{ "ids" }` must list each of that task’s subtasks once |
| PATCH | `/api/tasks/:id/subtasks/:subtaskId` | `{ "title"? , "completed"? }`. Does not update the parent task |
| DELETE | `/api/tasks/:id/subtasks/:subtaskId` | 204 |
| GET | `/api/focus-sessions/active` | The active session, or `null`. Active means `endedAt` is null |
| GET | `/api/focus-sessions` | Ended sessions for the signed-in user, newest `endedAt` first. `page`, `pageSize` (max 100) |
| POST | `/api/focus-sessions` | `{ "plannedSeconds", "taskId"? }`. `plannedSeconds` is 60 to 10800. 201 when a row is created. 200 when an active session already exists: the body is that session, and the plan and task are left as they were. A client `userId` is stripped. An unknown or foreign `taskId` is 400 |
| POST | `/api/focus-sessions/:id/pause` | Sets the open pause. A second pause returns the session unchanged |
| POST | `/api/focus-sessions/:id/resume` | Closes the open pause into `pausedSeconds`. A resume while running returns the session unchanged |
| POST | `/api/focus-sessions/:id/complete` | Sets `endedAt` and `completed: true`. Does not update the task |
| POST | `/api/focus-sessions/:id/stop` | Sets `endedAt` and `completed: false`. Does not update the task |

Task JSON includes `categoryId`, `category` (`{ id, name, color }` or null), `tags`, `subtasks`, `scheduledStart`, and `scheduledEnd`. `categoryId` must belong to the same user or the write is rejected. A client `userId` is stripped. Quadrant is computed and is not a stored field.

Focus session JSON includes `plannedSeconds`, `status` (`RUNNING`, `PAUSED`, `COMPLETED`, `STOPPED`), `startedAt`, `endedAt`, `pausedAt`, `pausedSeconds`, computed `elapsedSeconds` and `remainingSeconds`, `completed`, `serverNow`, and `task` (`{ id, title, status }` or null). `elapsedSeconds` in the response is calculated. The database column of that name is not the source of truth.

Routes for habits, goals, website rules, and notifications are not implemented.
