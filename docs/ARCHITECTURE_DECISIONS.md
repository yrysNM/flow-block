# Architecture decisions

## ADR-1. Monorepo beside the existing blocker

The repo already contained a Chrome extension and an Expo app. They still build and test. FocusFlow apps were added under `apps/` and `packages/` instead of rewriting the blocker into the new shell. `apps/extension` is a new MV3 shell with no feature logic, which is what this milestone asked for.

## ADR-2. Prisma 6.19.3

`prisma@latest` resolved to `8.0.0-rc.29`. The API pins Prisma CLI and client to `6.19.3` so generate and the migration diff stay on the current stable client API (`url = env("DATABASE_URL")`, `new PrismaClient()`).

## ADR-3. No Redis

Sessions are Postgres rows. The auth rate limit is a process-local map. A second store would not earn its keep for one API process. Compose starts Postgres only.

## ADR-4. HTTP-only session, same-origin proxy

The token is random. Only its SHA-256 is stored. The web app is `ssr: false` and calls `/api` on its own origin. Nitro proxies to Nest at runtime via `NUXT_API_PROXY_TARGET`. That avoids cross-site cookies during local development.

## ADR-5. Quadrant is not stored

`deriveEisenhowerQuadrant` runs on read and in the form. Status changes go through `assertTaskStatusTransition`. A combined illegal patch throws before any write.

## ADR-6. Zod in one package

Web and API import `@focusflow/shared-schemas`. Nest uses a small `ZodValidationPipe` instead of a second DTO class hierarchy. Swagger is annotated on the controllers for the routes that exist.

## ADR-7. Client-generated UUIDs

Prisma `@default(uuid())` assigns ids in the application. The migration does not add `gen_random_uuid()` defaults. Inserts go through Prisma.

## ADR-8. Shared packages compile to CommonJS

Nest’s build consumes `require`. The Nuxt app aliases the TypeScript source so the browser does not depend on that build.
