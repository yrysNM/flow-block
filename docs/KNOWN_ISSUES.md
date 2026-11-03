# Known issues

- Docker and PostgreSQL are not available for local Compose in the environment that produced this slice. `infrastructure/docker-compose.yml` is the supported local database. The integration test is skipped unless `FOCUSFLOW_INTEGRATION=1`
- Production Postgres is the Neon database connected to the Vercel project. `DATABASE_URL` is the pooled URL and `DATABASE_URL_UNPOOLED` is the direct URL. `prisma migrate deploy` applied `20261102100000_init` to that database. Register returns 503 again only if that database is unreachable
- Register and task routes return 503 when Postgres is down. Health stays 200 on purpose
- Auth rate limiting is per process and resets on restart
- Login timing can differ between an unknown email and a wrong password. The message does not
- The UI stores `theme` but always renders the light design system
- `weekStartsOn` is stored, editable, and used by the Tasks page for “Due this week.” There is still no calendar
- Categories can be referenced by id but cannot be created in the API. The matrix colors a bubble from `categoryId` and labels a missing id “No category.” It cannot show a category name
- The matrix does not draw lines between bubbles. A task has no dependency field
- Quadrant drag uses the browser’s drag and drop. The task detail dialog can set the same flags without a drag. Touch dragging was not verified
- The matrix was rendered in headless Chrome with temporary fixture tasks. Those fixtures were not committed. Postgres was not available, so create, list, and drag were not confirmed against the API in a browser
- `apps/extension` does not log in or block sites
- The Website Blocker and the Expo app do not use FocusFlow accounts
- There is no password reset, email verification, or CSRF token beyond `SameSite=Lax`
- Headless Chrome rendered the login page. The task screens were not clicked through, because creating an account needs Postgres
- Unfinished product modules (Kanban, focus timer, shared blocking, habits, goals, analytics, sync) are not implemented
