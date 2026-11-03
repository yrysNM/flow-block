# Changelog

## Unreleased — Tasks matrix

- The Tasks page is an Eisenhower matrix: four colored quadrants, round task bubbles, a status filter, search, and five summary counts
- Dragging a bubble, or choosing a quadrant in its details, writes `isUrgent` and `isImportant` only
- Due this week uses the saved week start. Overdue is a past deadline on a task that is not completed
- There is still no Kanban view, category CRUD, or connector lines

## Unreleased — Vercel production build

- Added a Vercel Services project config so production builds Nuxt and Nest together and keeps `/api` on the site origin
- API install now generates the Prisma client (including the Vercel Linux engine) and compiles the shared CommonJS packages
- The API allows the deployment host in CORS
- API install copies the Linux argon2 and Prisma query-engine binaries so the Vercel function can load them
- The Vercel API entry is an Express app that loads an ESM bundle of Nest. Vercel's Node runtime cannot `require()` Nest's ESM package. Install emits that bundle with decorator metadata so guards still inject

## 0.1.0 — Phase 0 and task slice

- Added the FocusFlow npm workspaces without removing the Website Blocker or the Expo app
- Added Nuxt 4 web shell, NestJS API, Prisma schema, Postgres Compose, and an MV3 extension shell
- Added email and password auth with argon2 and an HTTP-only session cookie
- Added task CRUD, status transitions, derived quadrant, dashboard, and settings
- Documented unfinished modules as unfinished

Verification for this change is recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
