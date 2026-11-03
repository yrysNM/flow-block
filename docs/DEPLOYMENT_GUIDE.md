# Deployment guide

FocusFlow production is one Vercel project, configured in `vercel.json` as two services:

1. `web` — Nuxt 4, root `apps/web`, framework `nuxtjs`
2. `api` — NestJS, root `apps/api`, entry `src/server.ts`, framework `express`

Vercel rewrites `/api/(.*)` to the API service and every other path to the web service. The browser calls same-origin `/api`, so the session cookie does not need a second origin. Services is in beta on all plans.

The root `npm run build` script is still the Website Blocker. Do not point the Vercel project at that script.

API install writes `apps/api/native/vercel-bundle.mjs` (gitignored with the Linux argon2 and Prisma engine files). `src/server.ts` is the Vercel Express entry and loads that bundle with `import()`. `src/main.ts` remains the local process entry (`node apps/api/dist/main.js`). Vercel detects `src/server` before `src/main`.

## What has to be true in the Vercel project

- Framework preset `services` (taken from `vercel.json`)
- Node.js 22.x, matching the version used to verify this repo
- Production branch `main`, once this configuration is on `main`
- `DATABASE_URL` for Postgres. Neon is the Vercel Marketplace database that fits Prisma. Use a pooled URL at runtime. Run `prisma migrate deploy` from `apps/api` with a direct (non-pooled) URL before relying on register or tasks
- `WEB_ORIGIN` when the site uses a custom domain. On `*.vercel.app`, the API also allows the deployment host from `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`

`Secure` cookies turn on when `NODE_ENV=production`. Vercel serves HTTPS.

Local processes still work the old way: Postgres from Compose, `node apps/api/dist/main.js`, and the Nitro server proxying `/api` with `NUXT_API_PROXY_TARGET`.

## Not deployed on Vercel

The extension shell is a separate artifact: `npm run build -w @focusflow/extension`. The legacy blocker build stays `npm run build` at the repo root (`dist/`). The Expo app stays in `mobile/`.

The in-memory auth rate limit does not span multiple API processes. There is no Redis to replace it yet.

Set a real database password. Do not reuse the Compose example.
