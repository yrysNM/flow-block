# FocusFlow extension

Chrome Manifest V3 client for FocusFlow website rules. It is not the Website Blocker in `src/`. That extension stays local to one Chrome profile and is still built from the repo root.

This package signs in with `POST /api/auth/extension/login`. The session token is stored in `chrome.storage.local`. It is not written into the source. The default API origin is `http://127.0.0.1:3001`, and the popup can change it.

The service worker syncs rules and the active focus session on a `chrome.alarms` timer named `focusflow-sync`, once a minute. It also syncs on install and browser startup. It does not use `setInterval`. Enforcement reads the cached rules when the network is down. Usage events stay in the cache until a post succeeds, and each event keeps its client id so a retry is stored once.

Load this directory unpacked after `npm run build -w @focusflow/extension`. The worker entry is `dist/background.js`.
