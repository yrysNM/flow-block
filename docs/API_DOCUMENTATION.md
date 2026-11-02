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
| POST | `/api/auth/extension/login` | 200, session cookie, and `{ token, user, preferences }`. The token is for the extension only. The web login response does not include it |
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
| GET | `/api/websites` | The signed-in user’s rules, domain order |
| POST | `/api/websites` | 201. `{ domain, mode?, enabled?, dailyLimitMinutes?, scheduleStartMinute?, scheduleEndMinute? }`. `mode` is `BLOCK` or `ALLOW`. Schedule minutes are both set or both null. A client `userId` is stripped. Duplicate domain is 409 |
| PATCH | `/api/websites/:id` | Same fields. 404 if not owned |
| DELETE | `/api/websites/:id` | 204 |
| GET | `/api/websites/usage` | Optional `date=YYYY-MM-DD` in the user time zone. Totals per rule, including zeros |
| POST | `/api/websites/usage-events` | `{ clientEventId, domain, seconds, occurredAt? }`. Stores the event once. A repeated `clientEventId` returns `stored: false` and does not add seconds |

Task JSON includes `categoryId`, `category` (`{ id, name, color }` or null), `tags`, `subtasks`, `scheduledStart`, and `scheduledEnd`. `categoryId` must belong to the same user or the write is rejected. A client `userId` is stripped. Quadrant is computed and is not a stored field.

Focus session JSON includes `plannedSeconds`, `status` (`RUNNING`, `PAUSED`, `COMPLETED`, `STOPPED`), `startedAt`, `endedAt`, `pausedAt`, `pausedSeconds`, computed `elapsedSeconds` and `remainingSeconds`, `completed`, `serverNow`, and `task` (`{ id, title, status }` or null). `elapsedSeconds` in the response is calculated. The database column of that name is not the source of truth.

| GET | `/api/habits` | Habits for the signed-in user, with `streak`, `targetCount`, and today’s count |
| POST | `/api/habits` | 201. `{ name, frequency?, targetCount? }`. Frequency is `DAILY` or `WEEKLY`. A client `userId` is stripped |
| GET | `/api/habits/:id` | One habit plus `entries` for `month=YYYY-MM` (default: the current month) |
| PATCH | `/api/habits/:id` | Name, frequency, or target. 404 if not owned |
| DELETE | `/api/habits/:id` | 204 |
| POST | `/api/habits/:id/check-ins` | 200. `{ date?, count? }`. Updates the entry for that habit and date. Does not insert a duplicate |
| GET | `/api/goals` | Goals with milestones, linked tasks, and derived `progress` |
| POST | `/api/goals` | 201. `{ title, description?, status?, deadline? }`. `deadline` is `YYYY-MM-DD` or null. A client `userId` and any progress field are stripped |
| GET | `/api/goals/:id` | One goal. 404 if not owned |
| PATCH | `/api/goals/:id` | Title, description, status, or deadline. Does not write a percentage |
| DELETE | `/api/goals/:id` | 204 |
| POST | `/api/goals/:id/milestones` | 201. `{ title }` |
| POST | `/api/goals/:id/milestones/reorder` | `{ ids }` must list each milestone on the goal once |
| PATCH | `/api/goals/:id/milestones/:milestoneId` | `{ title?, completed? }`. Progress on the response changes with `completed` |
| DELETE | `/api/goals/:id/milestones/:milestoneId` | 204 |
| POST | `/api/goals/:id/tasks` | `{ taskId }` links an existing task owned by the same user. A second link returns the goal |
| DELETE | `/api/goals/:id/tasks/:taskId` | Removes the link. The task stays |
| GET | `/api/analytics` | Optional `range=7` or `range=30` (default 7). Totals and one series point per local day. A client `userId` or client totals are stripped. See [ANALYTICS_METRICS.md](ANALYTICS_METRICS.md) |

Habit JSON includes `frequency`, `targetCount`, `streak`, `todayCount`, and `todayMet`. A detail adds `month` and `entries` (`date`, `count`, `met`). Goal JSON includes `deadline`, `status`, `milestones`, `tasks`, and `progress: { completed, total }`. There is no progress percentage column.

Analytics JSON includes `range`, `timezone`, `startDate`, `endDate`, `tasksCompleted`, `focusSeconds`, `websiteUsedSeconds`, `habitConsistency: { checkIns, expected }`, and `series`. Each series point has `date`, `tasksCompleted`, `focusSeconds`, `websiteUsedSeconds`, `habitCheckIns`, and `habitExpected`. A day with no rows is a zero.

A bearer token in `Authorization` is accepted anywhere a session cookie is. The extension uses that. Notification routes are not implemented.
