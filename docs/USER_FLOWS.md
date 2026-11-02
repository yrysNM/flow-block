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
2. On Tasks, enter a title and optional description, deadline, priority, urgent, and important
3. Save. Status stays on the value in the status field. The quadrant chip follows the two checkboxes only
4. The dashboard shows the new counts. The task appears under Due today only when its deadline falls on that local date

## Update work

1. Change status from the row. Illegal moves are rejected
2. Edit fields. Changing urgent or important does not change status unless the status control changed too
3. Delete asks for confirmation on the row, then removes the task

## Settings

1. Open Settings
2. Change name, time zone, or week start
3. Save. The next dashboard “today” uses the saved time zone

Unfinished flows (focus session, blocking, matrix drag, habits, goals, review) are not in the product yet.
