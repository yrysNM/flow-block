# Deployment guide

Not deployed. A production layout that matches the code:

1. Postgres 16. Run `prisma migrate deploy` from `apps/api`
2. API: `npm run build -w @focusflow/api`, then `node apps/api/dist/main.js` with `NODE_ENV=production`, `DATABASE_URL`, `PORT`, and `WEB_ORIGIN`
3. Web: build with `NUXT_API_PROXY_TARGET` pointing at the API, then run `node apps/web/.output/server/index.mjs`. The Nitro server must stay in front of the browser so `/api` is same-origin. A static file host alone will not proxy
4. Extension shell: load or pack `apps/extension` after `npm run build -w @focusflow/extension`. It has no backend

Set a real database password. Do not reuse the Compose example. `Secure` cookies require HTTPS. Put TLS on the web origin.

The in-memory auth rate limit does not span multiple API processes. There is no Redis to replace it yet.

The legacy extension build (`npm run build` at the root) is a separate artifact in `dist/`.
