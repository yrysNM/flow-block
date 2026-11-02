# Features

## Shipped in this slice

| Feature | Where |
| --- | --- |
| Register, login, logout, current user | API and web |
| Display name, time zone, week start | API and Settings |
| Task create, read, update, delete | API and Tasks page |
| Status change with transition rules | API and Tasks page |
| Filter by status, sort, paginate | API and Tasks page |
| Dashboard counts and tasks due today | API and Dashboard |
| Empty states | Dashboard and Tasks |
| Derived Eisenhower quadrant | API response and task UI |
| OpenAPI | `/api/docs` |

## Declared in the database, no product UI

Category, tag, subtask, time log, focus session, habit, habit entry, goal, milestone, website rule, website usage, notification.

## Already shipped outside this slice

The Website Blocker extension in `src/` blocks domains and enforces daily limits inside Chrome. The Expo app in `mobile/` is the Android companion. Neither uses the FocusFlow account.

## Not started

Focus timer, shared website blocking, Kanban, matrix drag and drop, analytics, AI planning.
