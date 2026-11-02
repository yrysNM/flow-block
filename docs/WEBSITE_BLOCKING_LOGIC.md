# Website blocking logic

Not implemented in the FocusFlow API or in `apps/extension`.

The schema reserves `website_rules` (domain, block or limit mode, enabled, optional daily minutes) and `website_usage` (per rule, per date, seconds). There are no routes.

The working blocker is the existing extension:

- Domain matching is in `src/shared/domain-matcher.ts`
- Rules and usage are in `chrome.storage` through `src/shared/storage.ts`
- The service worker redirects a matching tab to the extension blocked page
- Time counts only for the active tab in a focused window while the machine is not idle
- Usage resets on the local calendar date

That behavior is local to one Chrome profile. It does not read `website_rules` from Postgres. The Android app mirrors the product idea with on-device storage and a VPN bridge that still needs a native module. See `mobile/README.md`.
