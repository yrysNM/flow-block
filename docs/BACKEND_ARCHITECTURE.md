# Backend architecture

NestJS 12 application in `apps/api`. Global prefix `api`. Global `AuthGuard` with `@Public()` for health, register, login, and logout.

| Module | Responsibility |
| --- | --- |
| `auth` | Argon2 passwords, session issue and lookup, cookie, in-memory rate limit |
| `users` | Profile and preferences. Imports `AuthModule` so it can map the public user |
| `tasks` | Owner-scoped CRUD, summary, status rules, matrix, and planner |
| `categories`, `tags` | Owner-scoped catalogs and assignment |
| `focus` | One active focus session, pause, resume, and history. Elapsed time is computed |
| `websites` | Owner-scoped rules, usage totals, and idempotent visit events |
| `habits` | Owner-scoped habits, check-ins, and streaks computed on read |
| `goals` | Owner-scoped goals, milestones, task links, and derived progress |
| `analytics` | Read-only totals and a per-day series for the session user |
| `prisma` | Global `PrismaClient` |
| `health` | Liveness without a database query |

`TasksService` loads a row with `findFirst({ where: { id, userId } })`. Updates and deletes use `updateMany` / `deleteMany` with the same filter, because Prisma’s single-record `update` only accepts a unique selector.

Swagger is mounted at `/api/docs`. Unknown failures return a generic 500. Prisma connection failures return 503 without the connection string.

`POST /api/auth/register` and `POST /api/auth/login` are limited to 10 requests per minute per IP and path, in process memory.
