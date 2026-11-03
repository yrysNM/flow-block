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

## Vercel

The production project reads the API variables above. Vercel sets `VERCEL`, `VERCEL_URL`, and `VERCEL_PROJECT_PRODUCTION_URL`. The API treats those hosts as allowed CORS origins in addition to `WEB_ORIGIN`.

`NUXT_API_PROXY_TARGET` is injected from the API service binding. Public `/api` traffic is rewritten to Nest before it reaches Nitro.

Prisma on Vercel needs `DATABASE_URL`. A Neon pooled string belongs in `DATABASE_URL` for runtime. `prisma migrate deploy` needs the direct Neon string for that one command. Do not commit either value.

## Web

| Name | Purpose |
| --- | --- |
| `NUXT_PUBLIC_API_BASE` | Browser base. Keep `/api` |
| `NUXT_API_PROXY_TARGET` | Nest origin, default `http://127.0.0.1:3001`. Read at runtime by the Nitro proxy |

Do not point `NUXT_PUBLIC_API_BASE` at another origin unless the cookie policy is redesigned. `SameSite=Lax` will not send the cookie on cross-site `fetch`.

## Integration test

`FOCUSFLOW_INTEGRATION=1` enables `apps/api/test/tasks.integration.test.ts`. Postgres must already be migrated.
