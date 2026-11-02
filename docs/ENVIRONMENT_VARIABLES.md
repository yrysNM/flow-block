# Environment variables

Examples: `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`. Do not commit `.env`.

## API (`apps/api/.env`)

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres URL. Prisma reads it from the schema |
| `PORT` | No | Default `3001` |
| `WEB_ORIGIN` | No | CORS origin. Default `http://localhost:3000`. Comma-separated list allowed |
| `NODE_ENV` | No | `production` turns on the Secure cookie |

Local Compose value:

```text
postgresql://focusflow:focusflow@localhost:5432/focusflow?schema=public
```

That password is only for local Docker. There is no `SESSION_SECRET`. Session tokens are random and only their hash is stored.

## Web

| Name | Purpose |
| --- | --- |
| `NUXT_PUBLIC_API_BASE` | Browser base. Keep `/api` |
| `NUXT_API_PROXY_TARGET` | Nest origin, default `http://127.0.0.1:3001`. Read at runtime by the Nitro proxy |

Do not point `NUXT_PUBLIC_API_BASE` at another origin unless the cookie policy is redesigned. `SameSite=Lax` will not send the cookie on cross-site `fetch`.

## Integration test

`FOCUSFLOW_INTEGRATION=1` enables `apps/api/test/tasks.integration.test.ts`. Postgres must already be migrated.
