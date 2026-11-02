# Product requirements

## Shipped

A person can:

- Create an account with email, password, and name
- Log in, log out, and stay signed in with a server session
- See an empty dashboard when they have no tasks
- See counts by status and the tasks due on their local date
- Create, edit, delete, and change the status of their own tasks
- Set priority, urgent, important, description, deadline, and one category
- Search tasks and filter by status, priority, and category
- Create categories and tags, and attach or detach tags on a task
- Add, check off, reorder, and delete subtasks
- Move the same tasks across TODO, IN_PROGRESS, and COMPLETED on the board
- Change urgent or important without that change rewriting status
- Change status without that change rewriting urgent or important
- Set their name, IANA time zone, and the day the week starts on

A person cannot read or change another person’s rows.

## Explicitly not shipped

Eisenhower matrix drag and drop, recurring tasks, reminders, Pomodoro, website blocking in the new extension, habits, goals, analytics charts, AI planning, and sync with the existing blocker.

## Task rules

- Status is `TODO`, `IN_PROGRESS`, or `COMPLETED`
- Priority is `LOW`, `MEDIUM`, `HIGH`, or `URGENT`
- `isUrgent` and `isImportant` are independent of status
- Quadrant is derived: Do, Schedule, Delegate, Eliminate
- A completed task can return to To do. It cannot go straight to In progress
- Creating a task may start in any status. That is the initial value, not a transition

## Non-functional

- TypeScript strict
- Passwords hashed with argon2
- HTTP-only session cookie
- Validation errors in one shape
- OpenAPI for implemented routes
- Responsive shell using the FocusFlow color tokens
