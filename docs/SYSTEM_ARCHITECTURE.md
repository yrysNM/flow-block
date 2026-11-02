# System architecture

```text
Browser
  Nuxt (port 3000, client-rendered)
    Nitro proxy /api -> Nest (port 3001)
      Prisma
        PostgreSQL
```

The cookie is set by Nest and stored for the Nuxt origin because the browser only talks to `/api` on port 3000.

Shared packages:

- `@focusflow/shared-types` — unions, labels, transition rules, quadrant, view types
- `@focusflow/shared-schemas` — Zod input contracts
- `@focusflow/shared-utils` — IANA day bounds

`apps/extension` is a separate MV3 package with a popup and an install listener. It does not call the API.

`src/` and `mobile/` are the existing blocker. They keep their own storage. They are not clients of this API yet.

Redis is not part of the system. Sessions are rows in Postgres. Auth rate limiting is memory inside the API process.
