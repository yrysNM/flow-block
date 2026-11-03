# Changelog

## Unreleased — Vercel production build

- Added a Vercel Services project config so production builds Nuxt and Nest together and keeps `/api` on the site origin
- API install now generates the Prisma client (including the Vercel Linux engine) and compiles the shared CommonJS packages
- The API listens on Vercel and allows the deployment host in CORS

## 0.1.0 — Phase 0 and task slice

- Added the FocusFlow npm workspaces without removing the Website Blocker or the Expo app
- Added Nuxt 4 web shell, NestJS API, Prisma schema, Postgres Compose, and an MV3 extension shell
- Added email and password auth with argon2 and an HTTP-only session cookie
- Added task CRUD, status transitions, derived quadrant, dashboard, and settings
- Documented unfinished modules as unfinished

Verification for this change is recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
