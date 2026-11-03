# Known issues

- Docker and PostgreSQL are not available in the environment that produced this slice. `infrastructure/docker-compose.yml` is the supported local database. `prisma migrate deploy` was not executed here. The integration test is skipped unless `FOCUSFLOW_INTEGRATION=1`
- The Vercel production build does not provision Postgres by itself. Without `DATABASE_URL`, register returns 503 and task routes that touch the database do the same. Health stays 200. Production is deployed from `cursor/vercel-production-build-5ba7` until that config is on `main`
- Register and task routes return 503 when Postgres is down. Health stays 200 on purpose
- Auth rate limiting is per process and resets on restart
- Login timing can differ between an unknown email and a wrong password. The message does not
- The UI stores `theme` but always renders the light design system
- `weekStartsOn` is stored and editable. No calendar uses it yet
- Categories can be referenced by id but cannot be created in the API
- `apps/extension` does not log in or block sites
- The Website Blocker and the Expo app do not use FocusFlow accounts
- There is no password reset, email verification, or CSRF token beyond `SameSite=Lax`
- Headless Chrome rendered the login page. The task screens were not clicked through, because creating an account needs Postgres
- Unfinished product modules (Kanban, matrix drag and drop, focus timer, shared blocking, habits, goals, analytics, sync) are not implemented
