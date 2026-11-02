# FocusFlow extension shell

Chrome Manifest V3 shell for a later milestone. It has a popup and an install listener. It does not block sites, track time, or call the API.

The working website blocker that already shipped in this repository stays at the repo root (`src/`, `manifest.config.ts`). Do not fold that logic into this package in Phase 0.

Load unpacked from this directory after `npm run build -w @focusflow/extension`.
