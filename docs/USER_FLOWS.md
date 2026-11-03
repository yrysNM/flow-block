# User flows

## Create an account

1. Open `/register`
2. Enter name, email, and a password of at least 8 characters
3. The API creates the user, default preferences (UTC, system theme, Monday week start), and a session cookie
4. The app opens the dashboard

## Return later

1. Open `/login`
2. Submit email and password
3. The cookie is set again and the dashboard loads
4. Log out from the top bar. The session row is deleted and the cookie is cleared

## First task

1. From an empty dashboard, choose Create a task
2. On Tasks, use the round add button. Enter a title and optional description, deadline, priority, urgent, and important
3. Save. Status stays on the value in the status field. The bubble lands in the quadrant for those two flags
4. The dashboard shows the new counts. The task appears under Due today only when its deadline falls on that local date

## Update work

1. Open a bubble and change status. Illegal moves are rejected
2. Drag a bubble to another quadrant, or choose Move to in the details. That writes urgent and important only
3. Edit fields. Changing urgent or important does not change status unless the status control changed too
4. Delete asks for confirmation, then removes the task

## Settings

1. Open Settings
2. Change name, time zone, or week start
3. Save. The next dashboard “today” uses the saved time zone

Unfinished flows (focus session, blocking, Kanban, habits, goals, review) are not in the product yet.
