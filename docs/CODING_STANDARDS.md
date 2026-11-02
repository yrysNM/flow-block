# Coding standards

- TypeScript strict. No duplicated task-status unions
- Small Nest modules and Vue components. Script setup only in the web app
- Zod schemas are the input contract. Do not add a second class-validator copy
- Authorize in the query (`userId` in the `where`), not only in the UI
- Map Prisma rows to `TaskView` so `quadrant` stays derived
- Errors use `{ statusCode, error, message, details? }`
- ESLint (`npm run lint:focusflow`) covers `apps/` and `packages/`. Oxlint (`npm run lint`) covers the existing extension. Vue files rely on Nuxt auto-imports, so ESLint `no-undef` is off there; `nuxt typecheck` is the check
- Do not commit `.env`, build output, or generated Prisma client
- Comments only where a rule is easy to break, such as the extension shell doing no work on install
