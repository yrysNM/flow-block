# Synchronization

Website rules and focus-session state sync between the API and `apps/extension`. Tasks, habits, and the phone app do not.

## What syncs

The extension is a client of the same API. On each alarm, and on install and startup, it reads:

- `GET /api/auth/me` for the account time zone
- `GET /api/websites` for rules
- `GET /api/websites/usage` for today’s totals
- `GET /api/focus-sessions/active` for whether blocking is in focus mode

Writes from the web app are saved on the server first. The extension learns them on the next sync. It does not edit rules itself.

Usage visits are written by the extension. Each event keeps a client id. The server stores that id once. Offline events stay in `chrome.storage.local` and the next successful alarm sends them again with the same id.

## When the network is down

The last rules, focus flag, and usage totals stay in `chrome.storage.local`. Blocking uses that cache. New visits append to the queue. A failed flush leaves the remainder in order and tries again later. The service worker is expected to stop; `chrome.alarms` is what wakes it.

Sign-out tries to flush first. If the flush fails, the extension stays signed in so those events are not sent as a different user later.

## Not synced

The legacy blocker in `src/` and the Expo app in `mobile/` still keep their own on-device rules. There is no task sync in the extension and no conflict UI beyond the usage-event id.
