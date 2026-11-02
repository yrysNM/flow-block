# Timer logic

Phase 4a ships a focus timer. Website blocking is not part of this timer.

## One active session

A session is active when `ended_at` is null. Each user can have one active row.

`POST /api/focus-sessions` looks up that row first. If it exists, the response is **200** and the existing session. The request does not insert a second row and does not change `planned_seconds` or `task_id`. To start a different duration or task, end the current session first.

A new row is **201**. `started_at` is the server time. The owner id comes from the session cookie. A client `userId` is stripped.

If two starts race, the partial unique index `focus_sessions_one_active_per_user` on `user_id` where `ended_at` is null rejects the second insert. The API then reads the active row and returns it with 200. Prisma cannot model that index. A later `prisma migrate dev` diff may want to drop it. Do not drop it.

## Duration

Presets in the web UI are 15, 25, and 50 minutes. A custom plan is 1 to 180 minutes. The API accepts `plannedSeconds` from 60 to 10800. Presets are not an API enum.

`taskId` is optional. It must belong to the signed-in user, or the start is 400 “Task not found.” Completing or stopping a session does not update the task. Task status stays whatever it was.

## Elapsed time

The source of truth is server timestamps, not a client countdown and not the `elapsed_seconds` column. That column stays at its default of 0 and is not written.

Stored pause data:

- `paused_at` — start of the open pause. Null while running, and null after the session ends.
- `paused_seconds` — whole seconds of closed pause intervals.

```text
end = endedAt ?? now
openPause = pausedAt is set and earlier than end ? end - pausedAt : 0
elapsedSeconds = floor(max(0, end - startedAt - pausedSeconds - openPause) / 1000)
remainingSeconds = max(0, plannedSeconds - elapsedSeconds)
```

Example: start at 12:00:00, pause at 12:00:10, resume at 12:00:40. The closed pause is 30 seconds. Elapsed time at 12:00:40 is 10 seconds, not the 40 seconds of wall clock.

Pause only sets `paused_at`. A second pause does nothing. Resume adds the closed interval to `paused_seconds` and clears `paused_at`. A resume on an already running session does nothing. Neither write stores elapsed time.

The session does not complete itself when remaining time hits zero. Elapsed time may grow past the plan until the user ends it. Remaining time is then 0.

Ending the session sets `ended_at`. If a pause is open, that interval is added to `paused_seconds` and `paused_at` is cleared, so the trailing pause is not counted as work.

- `POST /api/focus-sessions/:id/complete` sets `completed` true.
- `POST /api/focus-sessions/:id/stop` sets `completed` false and frees the one active slot.

Status on read: `endedAt` and `completed` → `COMPLETED`; `endedAt` and not `completed` → `STOPPED`; `pausedAt` → `PAUSED`; otherwise `RUNNING`.

`GET /api/focus-sessions/active` returns the active session or null. `GET /api/focus-sessions` is history: ended sessions for the signed-in user, newest `ended_at` first.

The response includes `elapsedSeconds`, `remainingSeconds`, and `serverNow`. The web page may tick a clock from those values. That tick is a display. The page reloads the active session about every 15 seconds and after pause, resume, complete, and stop. It does not post a client elapsed time.

## Not this timer

The Website Blocker still tracks active-tab time for daily site limits in `src/background`. That is not a Pomodoro timer, and this milestone does not connect it to FocusFlow.
