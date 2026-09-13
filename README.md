# Website Blocker

A Manifest V3 Chrome extension that blocks distracting websites and enforces daily time limits. It only counts time when a matching tab is active in a focused window, then redirects to an extension blocked page when a site is banned or its daily cap is used up.

This is browser-level protection. It cannot replace OS-level parental controls, and a determined user can still disable the extension.

**GitHub:** https://github.com/yrysNM/flow-block

## Features

- Add a domain or URL and normalize it before saving
- Block a site completely, or give it a daily time limit
- Track active usage in seconds using timestamps rather than a one-second interval
- Redirect to `chrome-extension://<id>/src/blocked/index.html` as early as navigation APIs allow
- Reset usage automatically at local midnight
- Share an unlock link with a friend or trusted person; they tap **Accept** or **Denied**
- Popup, full dashboard, import/export, and optional 80% / 100% notifications

## Trusted unlock

You cannot turn off, delete, or reset a site while it is blocked or over its daily limit.

Share an unlock URL with a friend or trusted person. They open it and tap:

- **Accept** — allow the site until local midnight
- **Denied** — keep the site blocked

The link is an extension page, so it must be opened in this same Chrome profile (hand them the computer, or open the copied URL in another tab).

```text
src/
├── background/     Service worker: tabs, focus, navigation, usage, blocking
├── popup/          Compact React popup for daily management
├── options/        Full dashboard (overview, websites, statistics, settings)
├── blocked/        Dedicated blocked page
├── shared/         Types, storage, domain matching, time helpers
└── preview/        Browser gallery for the UI (no Chrome required)
```

UI pages never talk to `chrome.storage` directly. They go through `src/shared/storage.ts`. The service worker owns the live session and writes usage back through the same module.

## Manifest permissions

| Permission | Why it is required |
| --- | --- |
| `storage` | Persist website rules, usage, and settings in `chrome.storage.local` (and the in-progress session in `chrome.storage.session`). |
| `tabs` | Read the active tab URL, notice tab switches, and redirect a tab to the blocked page. |
| `webNavigation` | Observe main-frame navigations (including history changes on SPAs) as early as possible. |
| `idle` | Pause tracking when the computer is idle or locked. |
| `alarms` | Flush usage and schedule the next local-midnight reset while the service worker is suspended. |
| `notifications` | Optional 80% and 100% daily-limit alerts. |

No `<all_urls>` host permission is requested. Tab URLs come from the `tabs` permission. Blocking is done by redirecting the tab to an extension page, not by injecting a content script.

## How URL blocking works

1. `webNavigation.onBeforeNavigate`, `onCommitted`, `onHistoryStateUpdated`, and `tabs.onUpdated` inspect the main-frame URL.
2. The URL is matched with `matchesDomain()` against saved rules. `youtube.com` matches `www.youtube.com`, `m.youtube.com`, and `music.youtube.com`, but not `fakeyoutube.com` or `youtube.com.example.com`.
3. If the rule is enabled and set to block, or its daily limit is exhausted, the tab is redirected to the extension blocked page.
4. Refreshing, changing the path, or adding query parameters still matches the same domain, so it does not bypass the block.

## How active time tracking works

The service worker keeps a single session: `{ ruleId, startedAt }`.

Time is counted only when **all** of these are true:

- the browser window is focused
- the computer is not idle/locked
- the active tab’s URL matches an enabled rule
- that rule is not a complete block
- global protection and tracking are enabled

Elapsed time is `(now - startedAt) / 1000`. The session is flushed on tab change, window blur, navigation, idle, settings changes, and a 30-second alarm. Huge gaps (for example after sleep) are discarded so overnight idle time is not billed.

Background tabs are never counted. Several tabs of the same site still only count the active one.

## How daily reset works

`lastResetDate` is stored as the local `YYYY-MM-DD`. On startup, on every evaluate pass, and on a `chrome.alarms` fire at the next local midnight, usage is cleared if the calendar date has changed. Notification flags are cleared with it.

## Connect to GitHub

This project targets **https://github.com/yrysNM/flow-block**.

### Step 1 — Link GitHub in Cursor (recommended)

1. Open [cursor.com/codebase](https://cursor.com/codebase)
2. Click **Sync from GitHub**
3. Select **yrysNM/flow-block**
4. Confirm the sync

After sync, pushes to the Cursor Origin remote flow through to GitHub.

### Step 2 — Push the code

#### Windows (no WSL)

**Option A — GitHub Desktop (easiest)**

1. Install [GitHub Desktop](https://desktop.github.com/)
2. Sign in with your GitHub account
3. **File → Add local repository** and choose your project folder  
   (or **File → Clone repository** → URL: `https://github.com/yrysNM/flow-block.git`)
4. If the repo is empty, copy the project files into that folder
5. Write a commit message and click **Publish repository** or **Push origin**

**Option B — GitHub CLI in PowerShell**

1. Install [Git for Windows](https://git-scm.com/download/win) and [GitHub CLI](https://cli.github.com/)
2. Open **PowerShell** in your project folder:

```powershell
gh auth login
git remote set-url origin https://github.com/yrysNM/flow-block.git
git push -u origin main
```

**Option C — Cursor built-in Git**

1. Open the project in Cursor
2. Open the **Source Control** panel (branch icon on the left)
3. Sign in to GitHub when prompted
4. Stage all files, commit, then **Publish Branch** or **Push**

Create a token at https://github.com/settings/tokens if a tool asks for one (`repo` for private repos, `public_repo` for public).

#### macOS / Linux

```bash
gh auth login
git remote set-url origin https://github.com/yrysNM/flow-block.git
git push -u origin main
```

## Development

```bash
npm install
npm run test
npm run typecheck
npm run lint
npm run build
```

`npm run build` writes an unpacked extension to `dist/`.

`npm run dev` starts the CRXJS/Vite extension dev server.

`npm run preview` starts a UI gallery at http://127.0.0.1:43147 so you can click through the popup, dashboard, and blocked page with sample data.

## Load the extension in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `dist/` folder.
5. Pin **Website Blocker**, add a site such as `youtube.com`, then visit it.

## Tests

Vitest covers domain matching, URL normalization, duplicate prevention, daily reset, limit math, import/export validation, and the focused-tab tracking rules.

## Known limitations

- This cannot survive the user disabling or removing the extension.
- There can be a brief flash of the real page before the tab redirect runs. A network-level `declarativeNetRequest` rule would be earlier, but would need extra permissions.
- Chrome can suspend the service worker. Tracking therefore depends on events plus timestamps, not a forever-running interval.
- `chrome.idle` uses a 60-second detection interval, so short away-from-keyboard gaps may still count.
- Other Chromium browsers (Edge) should load the same `dist/` folder. Firefox needs a separate manifest pass later.
