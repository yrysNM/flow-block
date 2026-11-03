# Website blocking logic

Phase 4b enforces FocusFlow website rules from `apps/extension`. The legacy Website Blocker in `src/` is unchanged and still uses its own `chrome.storage` rules. It does not read FocusFlow accounts.

## Rules

A rule belongs to one user. The domain is normalized: lowercase, no scheme or path, and a leading `www.` is removed. `news.example.com` matches a rule for `example.com`. `example.com.evil.com` does not.

`mode` is `BLOCK` (blocklist) or `ALLOW` (allowlist). `LIMIT` remains in the database enum from the initial schema. The API stores new rules as `BLOCK` or `ALLOW`. A stored `LIMIT` row is treated as `BLOCK` and still uses `dailyLimitMinutes`.

Optional fields:

- `dailyLimitMinutes` — absent means no cap
- `scheduleStartMinute` and `scheduleEndMinute` — minutes from midnight in the account time zone, both set or both null. Both null means all day. The end minute is exclusive. If the start is after the end, the window wraps past midnight

Disabled rules do not match.

## Exact decision

`shouldBlockWebsite` in `@focusflow/shared-utils` is the decision. The extension calls it with the cached rules. It does not block the rest of the web. Only a matching block rule does.

1. If any enabled allowlist rule matches the host, do not block. Allow wins over block, including during focus.
2. Otherwise consider enabled block rules that match the host.
3. If the user has an active focus session, block. Active means `endedAt` is null, so a paused session still counts. The schedule and the daily limit are ignored while focus is on.
4. If no focus session is active, a block rule applies only inside its schedule. A missing window counts as all day.
5. Inside that schedule, a daily limit blocks only after `usedSeconds` reaches `dailyLimitMinutes * 60`. Under the limit, the host stays open. No limit means the host is blocked for the whole window.

The extension evaluates the minute of the day in the account time zone stored with the cache. The pure function takes that minute as an argument so tests do not depend on the machine clock.

## Usage

The extension queues a visit when the active tab leaves a site, and again on the one-minute alarm, so a sleeping service worker still records time. Each queued item has a client event id. `POST /api/websites/usage-events` inserts `website_usage_events` and adds the seconds to `website_usage` for that rule and local date. A repeated client event id, including a unique-index race, does not add the seconds again.

## Extension enforcement

Rules, the focus flag, and unsent visits live in `chrome.storage.local`. If sync fails, blocking uses that cache. `chrome.alarms` wakes the worker. The worker does not assume it stays alive and does not use `setInterval`.

A blocked tab is sent to the extension’s `blocked.html`. That page is not the legacy popup.
