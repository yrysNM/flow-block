# Testing strategy

Vitest 3.

| Suite | What it proves |
| --- | --- |
| `packages/shared-types` | Status transitions and “quadrant does not change status” |
| `packages/shared-schemas` | Unknown `userId` is stripped. Email is normalized |
| `packages/shared-utils` | UTC and America/New_York day bounds |
| `apps/api/src/tasks/tasks.service.test.ts` | Owner id on writes, status unchanged when only flags change, illegal transition does not write, 404 for a missing row, `completedAt` on complete, a daily completion inserts one next-day TODO, a second completion does not, a non-recurring completion inserts nothing |
| `apps/api/src/auth/auth.service.test.ts` | Password hash, preferences row, session token stored as an HMAC rather than the raw token, duplicate email, bad password |
| `apps/api/src/auth/session-secret.test.ts` | Production refuses an empty or placeholder `SESSION_SECRET` |
| `apps/api/src/users/users.service.test.ts` | Wrong current password does not write a hash. A correct one does, and sessions are not deleted. Theme round-trips |
| `apps/api/src/assistant/assistant.service.test.ts` | An empty prompt is rejected. A normal prompt returns not-configured, does not call fetch, and the module does not register a task writer |
| `packages/shared-utils/src/account.test.ts` | Saved focus seconds become the focus page’s initial duration |
| `apps/api/test/tasks.integration.test.ts` | Register, create task, list tasks against Postgres |

The integration file is skipped unless `FOCUSFLOW_INTEGRATION=1`. It was not executed in this environment. Docker and PostgreSQL were not installed. The service tests are the stand-in, with that limitation.

The original extension tests (`npm test` at the repo root) still cover domain matching, storage, unlock, and time math. They do not hit the API.

There is no browser end-to-end suite. A headless Chrome screenshot confirmed the login page renders. Task CRUD was not clicked through because the database was down (register returns 503).
