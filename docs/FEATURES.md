# Features

## Shipped in this slice

| Feature | Where |
| --- | --- |
| Register, login, logout, current user | API and web |
| Display name, time zone, week start | API and Settings |
| Task create, read, update, delete | API and Tasks page |
| Status change with transition rules | API and Tasks page |
| Filter by search, status, priority, and category, plus sort and pagination | API and Tasks page |
| Category create, rename, recolor, delete | API and Categories page |
| Tag create, rename, delete, attach, and detach | API, Categories page, and task editor |
| Subtasks: add, toggle, reorder, delete | API and task editor |
| Kanban columns TODO, IN_PROGRESS, COMPLETED with counts | API and Board page |
| Dashboard counts and tasks due today | API and Dashboard |
| Empty states | Dashboard, Tasks, Board, Categories |
| Derived Eisenhower quadrant | API response and task UI |
| OpenAPI | `/api/docs` |

## Declared in the database, no product UI

Time log, focus session, habit, habit entry, goal, milestone, website rule, website usage, notification. The quadrant is still derived. There is no matrix board.

## Already shipped outside this slice

The Website Blocker extension in `src/` blocks domains and enforces daily limits inside Chrome. The Expo app in `mobile/` is the Android companion. Neither uses the FocusFlow account.

## Not started

Focus timer, shared website blocking, Eisenhower matrix drag and drop, analytics, AI planning.
