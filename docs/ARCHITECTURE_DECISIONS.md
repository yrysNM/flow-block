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

## ADR-9. One Vercel project for web and API

Production is a single Vercel project using Services (beta). `vercel.json` builds Nuxt from `apps/web` and Nest from `apps/api`, then sends `/api/*` to Nest and every other path to Nuxt. The browser still calls `/api` on the site origin, so the `ff_session` cookie stays first-party. `NUXT_API_PROXY_TARGET` remains the local Nitro proxy target. On Vercel it is also injected from the API service binding.

The repository root `build` script stays the Website Blocker. It is not the FocusFlow production build.

The API `postinstall` runs `prisma generate`, compiles the shared packages, copies the Linux argon2 and Prisma query-engine binaries into `apps/api/native`, and bundles the Nest app to `apps/api/native/vercel-bundle.mjs`. Nest resolves the shared CommonJS `dist`, and those folders are gitignored. The Prisma generator includes `rhel-openssl-3.0.x` for Vercel Functions on Amazon Linux. Vercel's Node runtime cannot `require()` Nest's ESM package, and a plain esbuild bundle drops `emitDecoratorMetadata`, so the bundle is TypeScript-transpiled first (decorators kept) and then emitted as ESM with Nest left external. The Vercel function entry is `src/server.mjs` (detected before `src/main`). It exports an Express app and loads the bundle with a computed `import()`, so the function bundler does not rewrite Nest imports into `require()`. `src/main.ts` still listens only when it is the local process entry. CORS allows `WEB_ORIGIN` plus the deployment host Vercel provides.
