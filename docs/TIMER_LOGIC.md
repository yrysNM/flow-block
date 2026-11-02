# Timer logic

Not implemented in FocusFlow.

The later focus timer is a session with a planned duration, an optional task, and elapsed time. The `focus_sessions` table reserves `planned_seconds`, `elapsed_seconds`, `started_at`, `ended_at`, `completed`, and an optional `task_id`. Nothing writes those rows.

The existing Website Blocker tracks active-tab time for daily site limits. That logic stays in `src/background` and is not a Pomodoro timer. It is documented in the repository root README.
