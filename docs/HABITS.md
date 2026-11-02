# Habits

Habits are their own rows. They are not tasks and they do not appear on the board, matrix, or planner.

## Fields

A habit has a name, a frequency (`DAILY` or `WEEKLY`), and a `targetCount` of at least 1. The signed-in user owns it. A client `userId` is stripped.

A check-in is one `habit_entries` row per habit and civil date. The date is `YYYY-MM-DD`, stored at UTC midnight. The entry’s `count` is how many times that date was checked in.

`completed` on the entry is written as `count >= targetCount` for convenience. Streak and the calendar do not read that flag. They compare `count` with the habit’s current target, so changing the target later cannot leave a stored streak behind.

## Check-in

`POST /api/habits/:id/check-ins` with `{ date?, count? }`.

- `date` omitted uses today in the user’s time zone.
- No row for that habit and date: create one. Omitted `count` stores 1. A provided `count` stores that number, including 0.
- A row already exists: update it. Omitted `count` adds 1 to the stored count. A provided `count` replaces it.
- A unique conflict on `(habit_id, entry_date)` updates the existing row. It does not insert a second one.

The response is 200 and includes the entry plus the habit, with the streak recomputed.

## Streak

`currentHabitStreak` in `@focusflow/shared-utils` computes the current streak on read.

Daily: a date is met when its count is at least the target. If today is met, the streak walks backward from today. If today is not met, it walks backward from yesterday, so the streak is still there until the day is over. If that starting date is not met, the streak is 0. A missed day in the walk stops it.

Examples for a target of 1:

- Entries on 2026-11-01 and 2026-11-02, nothing on 2026-11-03, today 2026-11-04 not checked in: streak 0.
- Entries on 2026-11-01, 2026-11-02, and 2026-11-04, today 2026-11-04: streak 1.
- Entries on 2026-11-01 through 2026-11-03, today 2026-11-04 not checked in: streak 3.

Weekly: counts in a week are summed. The week starts on `weekStartsOn` from the user’s preferences (0 Sunday through 6 Saturday, default Monday). A week is met when the sum is at least the target. The same “this period if met, otherwise the previous period” rule applies, stepping by seven days.

## Calendar

`GET /api/habits/:id?month=YYYY-MM` returns that month’s entries. The Habits page draws them. The week starts on the same preference. Clicking a day checks in that date. The planner still does not use `weekStartsOn`.
