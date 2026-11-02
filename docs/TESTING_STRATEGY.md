# Testing strategy

Vitest 3.

| Suite | What it proves |
| --- | --- |
| `packages/shared-types` | Status transitions and “quadrant does not change status” |
| `packages/shared-schemas` | Unknown `userId` is stripped. Email is normalized |
| `packages/shared-utils` | UTC and America/New_York day bounds |
| `apps/api/src/tasks/tasks.service.test.ts` | Owner id on writes, status unchanged when only flags change, illegal transition does not write, 404 for a missing row, `completedAt` on complete |
| `apps/api/src/auth/auth.service.test.ts` | Password hash, preferences row, session token stored only as SHA-256, duplicate email, bad password |
| `apps/api/test/tasks.integration.test.ts` | Register, create task, list tasks against Postgres |

The integration file is skipped unless `FOCUSFLOW_INTEGRATION=1`. It was not executed in this environment. Docker and PostgreSQL were not installed. The service tests are the stand-in, with that limitation.

The original extension tests (`npm test` at the repo root) still cover domain matching, storage, unlock, and time math. They do not hit the API.

There is no browser end-to-end suite. A headless Chrome screenshot confirmed the login page renders. Task CRUD was not clicked through because the database was down (register returns 503).
