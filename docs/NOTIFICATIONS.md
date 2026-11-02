# Notifications

In-app rows only. There is no email, no push, and no background scheduler. The table is not seeded.

## When a row is written

Both writes use the session user id and happen in the same database transaction as the change that caused them.

- Completing a focus session inserts one row: title “Focus session completed”, link `/focus`, type `FOCUS`. Stopping a session does not. Completing that same session again does not insert a second row, because the session has already ended.
- Inserting the successor of a daily or weekly task inserts one row: a short title beginning “Next task:”, link `/tasks`, type `TASK_DUE`. If the successor is not inserted, no row is inserted.

`title` and `read_at` were already on `notifications`. `link_path` is the only new column (`20261102180000_notification_link`). `body` stays unused.

## Reading them

`GET /api/notifications` returns the signed-in user’s rows, newest first, at most 100, plus `unreadCount` for every unread row. A client `userId` is not read.

`POST /api/notifications/:id/read` marks one row. The update is `where id and userId and readAt is null`. A second call returns the same `readAt` and does not write again. Another user’s id is 404 and does not write.

`POST /api/notifications/read-all` marks that user’s unread rows. It does not touch anyone else’s.

The shell shows an unread count and `/notifications` lists the rows. Mark read and mark all read call those routes. The list is empty until one of the two events above happens.
