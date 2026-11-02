# Frontend architecture

Nuxt 4 app in `apps/web`. Source lives under `app/` because that is Nuxt 4’s default. `ssr: false` so auth runs in the browser.

| Path | Role |
| --- | --- |
| `app/pages/login.vue`, `register.vue` | Public auth forms |
| `app/pages/index.vue` | Dashboard |
| `app/pages/tasks/index.vue` | Task list, filters, editor, tags, and subtasks |
| `app/pages/board.vue` | Kanban. Native drag and drop, plus a status menu |
| `app/pages/matrix.vue` | Four quadrants. Drag writes urgent and important. A menu does the same on touch |
| `app/pages/planner.vue` | One day, an hour timeline, and unscheduled tasks |
| `app/pages/focus.vue` | Focus timer and session history. The ticking clock is a display |
| `app/pages/blocking.vue` | Website rules and today’s usage totals |
| `app/utils/schedule.ts` | Civil dates and time blocks in the user time zone |
| `app/pages/categories.vue` | Category and tag CRUD |
| `app/pages/habits.vue` | Habit CRUD, today’s check-in, and a month calendar |
| `app/pages/goals.vue` | Goal CRUD, milestones, and links to existing tasks |
| `app/pages/analytics.vue` | 7- and 30-day totals and an ECharts trend |
| `app/pages/settings.vue` | Name, time zone, week start |
| `app/layouts/default.vue` | Sidebar, top bar, content |
| `app/layouts/auth.vue` | Centered auth card |
| `app/middleware/auth.global.ts` | Loads `/auth/me`, guards routes |
| `app/stores/auth.ts`, `tasks.ts`, `catalog.ts` | Pinia |
| `app/composables/useApi.ts` | `$fetch` with credentials |
| `server/routes/api/[...path].ts` | Runtime proxy to `NUXT_API_PROXY_TARGET` |

Nuxt aliases the shared packages to their TypeScript source. The API consumes the compiled CommonJS build instead.

The dashboard loads habits and goals with `useApi` beside the task summary. It lists today’s check-ins and active goals. It does not draw a chart. Habits and goals are not kept in the tasks Pinia store.

Apache ECharts is a dependency of the analytics page only. Vue Query and VueDraggable are not dependencies. The board, matrix, and planner use HTML5 drag and drop. Touch screens also get a quadrant menu or a start-time control.
