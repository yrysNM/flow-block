# Environment variables

Examples: `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`. Do not commit `.env`. Do not bake these values into images.

## API (`apps/api/.env`)

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres URL. Prisma reads it from the schema |
| `PORT` | No | Default `3001` |
| `WEB_ORIGIN` | No | CORS origin. Default `http://localhost:3000`. Comma-separated list allowed |
| `NODE_ENV` | No | `production` turns on the Secure cookie unless `COOKIE_SECURE` overrides it, and requires `SESSION_SECRET` |
| `SESSION_SECRET` | In production | Pepper for the session-token HMAC. At least 32 characters. Not a placeholder |
| `COOKIE_SECURE` | No | `1` or `true` forces the Secure cookie. `0` or `false` leaves it off. Unset follows `NODE_ENV=production` |
| `RUN_MIGRATIONS` | No | API image only. `1` (default) runs `prisma migrate deploy` before listen. `0` skips it |

Local dev Compose value:

```text
postgresql://focusflow:focusflow@localhost:5432/focusflow?schema=public
```

That password is only for local Docker. Development can omit `SESSION_SECRET`. The API then uses a built-in development pepper that production rejects.

Production refuses to boot when `SESSION_SECRET` is empty, shorter than 32 characters, or any of these placeholders:

- `focusflow-dev-only`
- `change-me`
- `changeme`
- `secret`
- `session-secret`
- `focusflow`
- `password`
- `replace-with-a-long-random-session-secret`

Session tokens are still 32 random bytes. The database stores HMAC-SHA256 of the token with `SESSION_SECRET`, not the token and not an unsalted SHA-256.

## Web

| Name | Purpose |
| --- | --- |
| `NUXT_PUBLIC_API_BASE` | Browser base. Keep `/api` |
| `NUXT_API_PROXY_TARGET` | Nest origin. Dev default `http://127.0.0.1:3001`. Production Compose sets `http://api:3001`. Read at runtime by the Nitro proxy |
| `HOST` / `PORT` | Web image listen address. Compose uses `0.0.0.0` and `3000` |
| `NITRO_HOST` / `NITRO_PORT` | Same listen address for the Nitro server |

Do not point `NUXT_PUBLIC_API_BASE` at another origin unless the cookie policy is redesigned. `SameSite=Lax` will not send the cookie on cross-site `fetch`.

## Production Compose

`infrastructure/docker-compose.prod.yml` reads:

| Name | Default in that file |
| --- | --- |
| `SESSION_SECRET` | None. Compose fails the config if it is unset |
| `COOKIE_SECURE` | `0` for local HTTP. Set `1` behind TLS |
| `POSTGRES_USER` | `focusflow` |
| `POSTGRES_PASSWORD` | `focusflow` (local example only) |
| `POSTGRES_DB` | `focusflow` |
| `WEB_ORIGIN` | `http://localhost:3000` |

The dev Compose file does not read `SESSION_SECRET`.

## Integration test

`FOCUSFLOW_INTEGRATION=1` enables `apps/api/test/tasks.integration.test.ts`. Postgres must already be migrated.
