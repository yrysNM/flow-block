# Features

## Shipped in this slice

| Feature | Where |
| --- | --- |
| Register, login, logout, current user | API and web |
| Display name, email shown read-only, password change, theme, time zone, week start, focus default, stored English | API and Settings |
| Task create, read, update, delete, including daily or weekly recurrence | API and Tasks, Matrix, and Planner forms |
| Status change with transition rules | API and Tasks page |
| Filter by search, status, priority, and category, plus sort and pagination | API and Tasks page |
| Category create, rename, recolor, delete | API and Categories page |
| Tag create, rename, delete, attach, and detach | API, Categories page, and task editor |
| Subtasks: add, toggle, reorder, delete | API and task editor |
| Kanban columns TODO, IN_PROGRESS, COMPLETED with counts | API and Board page |
| Eisenhower matrix with counts, create, edit, and drag | API and Matrix page |
| Daily planner timeline and unscheduled list | API and Planner page |
| Focus timer, pause and resume, and session history | API and Focus page |
| Website rules, usage totals, and extension blocking | API, Blocking page, and `apps/extension` |
| Dashboard counts, tasks due today, today’s habits, and active goals | API and Dashboard |
| Habit CRUD, check-in, streak, and a month calendar | API and Habits page |
| Goal CRUD, milestones, task links, and derived progress | API and Goals page |
| Analytics totals and a daily trend | API and Analytics page |
| Assistant prompt that returns not-configured | API and Assistant page |
| Empty states | Dashboard, Tasks, Board, Matrix, Planner, Categories, Habits, Goals |
| Derived Eisenhower quadrant | API response and task UI |
| OpenAPI | `/api/docs` |

## Declared in the database, no product UI

Time log and notification. The quadrant is still derived. The time log is not the planner and is not the focus timer. Habits, goals, milestones, and website rules are used by the API.

## Already shipped outside this slice

The Website Blocker extension in `src/` blocks domains and enforces daily limits inside Chrome. The Expo app in `mobile/` is the Android companion. Neither uses the FocusFlow account.

## Not started

A configured assistant model, a notification inbox, and connecting the legacy `src/` blocker to these rules. The assistant page does not call a model and does not create tasks. Recurrence inserts one next task on completion and does not send a notification. Email change and password reset are not implemented. Language is stored and is not translated. Production images are defined and were not built in this environment.
