# Extension architecture

Two Chrome extensions exist. Only `apps/extension` is the FocusFlow client.

## `apps/extension`

Manifest V3:

- `manifest.json` asks for `storage`, `alarms`, `tabs`, `windows`, and `<all_urls>`
- `popup.html` signs in. It is not a second copy of the Website Blocker popup
- `blocked.html` is the page a blocked tab is sent to
- `src/background.ts` is the service worker. The built file is `dist/background.js`
- `src/cache.ts` holds the pure cache, queue, and block decision used when the network is down

Sign-in calls `POST /api/auth/extension/login` on the API origin. The default origin is `http://127.0.0.1:3001` and the popup can change it. Nothing secret is compiled into the extension. The response includes the session token once, because the web cookie is `HttpOnly` and `SameSite=Lax` and is not sent on extension fetches. The token is stored in `chrome.storage.local`.

The worker registers `chrome.alarms` alarm `focusflow-sync` for every minute, and also runs on install and browser startup. Each wake syncs rules, usage totals, and `GET /api/focus-sessions/active`, flushes the usage queue, and enforces the active tab from the cache. Listeners are registered at the top level so a restarted worker still has them.

Build with `npm run build -w @focusflow/extension` and load this folder unpacked.

## `src/` (preserved)

The Website Blocker that already shipped. Vite and CRXJS build it to the repo `dist/` via `npm run build`. It uses `chrome.storage`, tab events, and its own blocked page. It does not share the FocusFlow session. `npm test` still runs that suite. Do not replace it with this package.

Firefox is not supported. The repository root README describes the older blocker’s permissions and limits.
