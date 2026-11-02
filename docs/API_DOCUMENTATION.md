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
| GET | `/api/tasks` | `status`, `sort` (`createdAt`, `updatedAt`, `deadline`, `priority`, `title`), `order`, `page`, `pageSize` (max 100) |
| GET | `/api/tasks/summary` | Optional `date=YYYY-MM-DD`. Defaults to today in the user time zone |
| GET | `/api/tasks/:id` | 404 if not owned |
| POST | `/api/tasks` | 201 |
| PATCH | `/api/tasks/:id` | At least one field |
| PATCH | `/api/tasks/:id/status` | `{ "status" }` |
| DELETE | `/api/tasks/:id` | 204 |

Task JSON may include `categoryId`. The category must belong to the same user. There is no category API yet.

Routes for habits, goals, focus sessions, website rules, and notifications are not implemented.
