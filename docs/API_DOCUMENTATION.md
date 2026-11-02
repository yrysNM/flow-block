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
| GET | `/api/tasks/:id` | 404 if not owned |
| POST | `/api/tasks` | 201 |
| PATCH | `/api/tasks/:id` | At least one field |
| PATCH | `/api/tasks/:id/status` | `{ "status" }`. Writes status only in meaning: urgent and important stay as they are |
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

Task JSON includes `categoryId`, `category` (`{ id, name, color }` or null), `tags` (`{ id, name }[]`), and `subtasks` (`{ id, taskId, title, completed, position }[]`). `categoryId` must belong to the same user or the write is rejected. A client `userId` is stripped.

Routes for habits, goals, focus sessions, website rules, and notifications are not implemented. There is no Eisenhower-board route.
