# FocusFlow docs

These files describe the product and what this repository actually contains after Phase 5d: auth, tasks, categories, tags, subtasks, Kanban, the Eisenhower matrix, the daily planner, the focus timer, website rules, the FocusFlow extension, habits, goals, analytics, account settings, and production packaging.

Start here:

- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) — what runs today
- [CURSOR_CONTEXT.md](CURSOR_CONTEXT.md) — current state for the next session
- [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md) — why the stack looks like this
- [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) — how to run it
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) — implemented HTTP routes
- [EISENHOWER_MATRIX.md](EISENHOWER_MATRIX.md) — quadrant board
- [DAILY_PLANNER.md](DAILY_PLANNER.md) — one-day time blocks
- [HABITS.md](HABITS.md) — check-ins and streaks
- [GOALS.md](GOALS.md) — milestones, task links, and derived progress
- [ANALYTICS_METRICS.md](ANALYTICS_METRICS.md) — how each analytics number is computed
- [SETTINGS.md](SETTINGS.md) — profile, password change, theme, focus default, and stored language

Website rules and the FocusFlow extension are shipped. Habits, goals, analytics, account settings, and production packaging are shipped. The legacy blocker in `src/` is still separate. The focus timer and the matrix are shipped. The quadrant on a task is still calculated from urgent and important. The AI assistant, recurring tasks, and notification delivery are not built. Image builds were not run here.
