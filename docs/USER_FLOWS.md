# User flows

## Create an account

1. Open `/register`
2. Enter name, email, and a password of at least 8 characters
3. The API creates the user, default preferences (UTC, system theme, Monday week start, 25 minute focus default, English), and a session cookie
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

## Matrix

1. Open Matrix. Each quadrant shows how many tasks match those two flags
2. Drag a card to another quadrant, or use the quadrant menu
3. The move updates urgent and important. Status stays the same
4. Add or edit a task from the matrix. That uses the same task record

## Planner

1. Open Planner. It shows one local day
2. Scheduled tasks sit on the hour they start. Tasks with no block stay in the unscheduled list
3. Schedule from that list, or drop a task on an hour. The same task gains a start and end
4. Move a block to another hour. Status and quadrant do not change
5. Unschedule clears both times. The task leaves the timeline

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
2. Change the display name, theme, time zone, week start, or default focus length. Email is shown and cannot be changed. Language stays English and is stored, not translated
3. Save. The shell uses the saved theme. The next dashboard “today” uses the saved time zone. The focus page starts at the saved length
4. To change the password, enter the current password and a new one. A wrong current password does nothing. A correct one keeps this session signed in

The shell shows an unread count. Open Notifications to mark a row read. Nothing on that page is email.

## Focus

1. Open Focus
2. The duration starts from the saved focus default (15, 25, or 50 minutes when that is exact, otherwise custom). Change it if you want, and optionally pick an existing task
3. Start. If a session is already running or paused, the page keeps that one
4. Pause and resume. The displayed clock follows the server’s elapsed time
5. Complete, or end without completing. The task status does not change. The session moves to history

## Blocking

1. Open Blocking and add a domain as Block or Allow
2. Optionally set a daily minute cap and a time window
3. Sign the FocusFlow extension in to the same account
4. While a focus session is active, matching block rules block. Allow rules stay open
5. With no focus session, a block rule applies only inside its window, and only after its daily limit when one is set
6. Today’s totals on the Blocking page come from usage the extension reported

## Habits

1. Open Habits and add a name, daily or weekly frequency, and a target count
2. Check in for today, or click a day on the month calendar
3. Checking in again on that date updates the same entry
4. The streak shown on the habit is computed from those entries

## Goals

1. Open Goals and add a title, optional description, deadline, and status
2. Add milestones, mark them complete, reorder them, or delete them
3. Link a task that already exists. Unlinking leaves the task in the task list
4. The “n of m” line counts completed milestones and completed linked tasks

## Analytics

1. Open Analytics and choose the last 7 days or the last 30 days
2. The totals and the chart come from `GET /api/analytics` for the signed-in user
3. A range with no tasks, focus time, website usage, or habit check-ins shows an empty state instead of a sample chart

## Recurring task

1. Create or edit a task and set Repeats to Daily or Weekly
2. Mark that task completed
3. The completed task stays completed. One new to-do appears, due one interval later when the original had a deadline
4. Completing it again does not add a second copy. A task that does not repeat adds none

## Assistant

1. Open Assistant and write a prompt
2. Submit it. The page calls `POST /api/assistant` as the signed-in user
3. The response is not-configured. No suggestion list is invented, and no task is created

A configured model is not in the product yet. Email and push notifications are not either.
