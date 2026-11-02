# Known issues

- Docker and PostgreSQL are not available in the environment that produced this slice. `infrastructure/docker-compose.yml` is the supported database. `prisma migrate deploy` was not executed. The integration test is skipped unless `FOCUSFLOW_INTEGRATION=1`
- Register and task routes return 503 when Postgres is down. Health stays 200 on purpose
- Auth rate limiting is per process and resets on restart
- Login timing can differ between an unknown email and a wrong password. The message does not
- The UI stores `theme` but always renders the light design system
- `weekStartsOn` is stored and editable. No calendar uses it yet
- The board, matrix, and planner each show at most 100 tasks in a column or list. The count is still the full total
- Planner drag snaps a block to the start of an hour. The length is kept when the block already has one. A block cannot cross local midnight
- `20261102120000_task_schedule` is written and was not applied. `prisma migrate deploy` still needs Postgres
- `apps/extension` does not log in or block sites
- The Website Blocker and the Expo app do not use FocusFlow accounts
- There is no password reset, email verification, or CSRF token beyond `SameSite=Lax`
- Headless Chrome rendered the login page. The task screens were not clicked through, because creating an account needs Postgres
- Unfinished product modules (focus timer, shared blocking, habits, goals, analytics, sync) are not implemented
- Matrix, planner, Kanban, categories, tags, and subtasks were not clicked through in a browser. Postgres is still unavailable, so register cannot create the rows those screens need
