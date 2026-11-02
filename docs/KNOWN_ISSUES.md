# Known issues

- Docker and PostgreSQL are not available in the environment that produced this slice. `infrastructure/docker-compose.yml` is the supported database. `prisma migrate deploy` was not executed. The integration test is skipped unless `FOCUSFLOW_INTEGRATION=1`
- Register and task routes return 503 when Postgres is down. Health stays 200 on purpose
- Auth rate limiting is per process and resets on restart
- Login timing can differ between an unknown email and a wrong password. The message does not
- The UI stores `theme` but always renders the light design system
- `weekStartsOn` is stored and editable. No calendar uses it yet
- The board shows at most 100 cards in a column. The column count is still the full total. Older cards stay on the task list
- `apps/extension` does not log in or block sites
- The Website Blocker and the Expo app do not use FocusFlow accounts
- There is no password reset, email verification, or CSRF token beyond `SameSite=Lax`
- Headless Chrome rendered the login page. The task screens were not clicked through, because creating an account needs Postgres
- Unfinished product modules (Eisenhower matrix drag and drop, focus timer, shared blocking, habits, goals, analytics, sync) are not implemented
- Kanban, categories, tags, and subtasks were not clicked through in a browser. Postgres is still unavailable, so register cannot create the rows those screens need
