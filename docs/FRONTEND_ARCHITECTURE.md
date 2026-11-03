# Frontend architecture

Nuxt 4 app in `apps/web`. Source lives under `app/` because that is Nuxt 4’s default. `ssr: false` so auth runs in the browser.

| Path | Role |
| --- | --- |
| `app/pages/login.vue`, `register.vue` | Public auth forms |
| `app/pages/index.vue` | Dashboard |
| `app/pages/tasks/index.vue` | Eisenhower matrix, task details, and editor |
| `app/pages/settings.vue` | Name, time zone, week start |
| `app/layouts/default.vue` | Sidebar, top bar, content |
| `app/layouts/auth.vue` | Centered auth card |
| `app/middleware/auth.global.ts` | Loads `/auth/me`, guards routes |
| `app/stores/auth.ts`, `tasks.ts` | Pinia |
| `app/composables/useApi.ts` | `$fetch` with credentials |
| `server/routes/api/[...path].ts` | Runtime proxy to `NUXT_API_PROXY_TARGET` |

Nuxt aliases the shared packages to their TypeScript source. The API consumes the compiled CommonJS build instead.

Vue Query, VueDraggable, and ECharts are not dependencies.
