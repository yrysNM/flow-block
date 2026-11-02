# Extension architecture

Two Chrome extensions exist. Only one is FocusFlow’s future client.

## `apps/extension` (this milestone)

Manifest V3 shell:

- `manifest.json`
- `popup.html` plus `src/popup.ts`
- `src/background.ts` listens for install and does nothing else

There is no blocking, no storage of tasks, and no API client. Build with `npm run build -w @focusflow/extension` and load this folder unpacked. The service worker file is `dist/background.js`.

## `src/` (preserved)

The Website Blocker that already shipped. Vite and CRXJS build it to the repo `dist/` via `npm run build`. It uses `chrome.storage`, tab events, and an extension blocked page. It does not share the FocusFlow session. Do not move that logic into `apps/extension` until the sync phase.

Firefox is not supported. The existing README in the repository root describes the blocker permissions and limits.
