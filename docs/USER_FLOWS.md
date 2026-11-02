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

## Organize a task

1. Open Categories and add a category or a tag. Names are unique on your account
2. On Tasks, set the category while creating or editing
3. After the task exists, attach a tag, add subtasks, check them off, and move them up or down
4. Search the list, or filter by status, priority, or category

## Board

1. Open Board. Each column shows how many tasks are in that status
2. Drag a card to another column, or use the status menu on the card
3. The move updates status. Urgent and important stay as they were. An illegal move shows an error and does not write

## Update work

1. Change status from the row. Illegal moves are rejected
2. Edit fields. Changing urgent or important does not change status unless the status control changed too
3. Delete asks for confirmation on the row, then removes the task

## Settings

1. Open Settings
2. Change name, time zone, or week start
3. Save. The next dashboard “today” uses the saved time zone

Unfinished flows (focus session, blocking, Eisenhower drag, habits, goals, review) are not in the product yet.
