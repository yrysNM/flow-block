# Settings and account security

Settings are for the signed-in user. The API reads the user id from the session. A client `userId` is stripped.

## Profile

`PATCH /api/users/me` updates the display name. Email is shown on the Settings page and is not writable. Changing the email address is out of scope.

## Password

`PATCH /api/users/me/password` takes `currentPassword` and `newPassword`. The new password must be 8 to 200 characters, the same bound as register.

The API loads the stored argon2id hash, verifies the current password, and only then writes a new hash. A wrong current password returns 401 with “Current password is incorrect.” and does not call an update, so the stored hash stays as it was. The message is specific to this route. Login still uses “Invalid email or password.”

A successful change does not delete session rows and does not clear `ff_session`. The person stays signed in. This is not a password reset. There is still no reset email and no “forgot password” flow.

## Theme

`theme` is `light`, `dark`, or `system`. It is saved on `user_preferences` and returned with the session. The web shell sets `data-theme` on `document.documentElement` from that value. Light and dark replace the background, surface, ink, and line tokens. System uses the light tokens, and the dark tokens when the device prefers a dark color scheme. Saving the preference changes the shell. It is not only a database column.

Some page-local form fields still set their own background. The shell around them follows the saved theme.

## Focus default

`focusDefaultSeconds` is the initial duration on the focus page. The default is 1500 (25 minutes). Allowed values are 60 through 10800 seconds, the same bounds as starting a session. Exact 15, 25, and 50 minute values select those presets. Any other saved length selects Custom.

The page applies the saved value once, when preferences are available, and does not overwrite a duration the person already picked on that visit. Completing a session still does not change task status.

## Language

`language` is stored on the account. The only accepted value is `en`. The interface stays English. This is not a translation system and does not load another locale.

## Notifications

Settings does not add an email or push toggle. In-app notifications are listed from the shell, not from this form. See [NOTIFICATIONS.md](NOTIFICATIONS.md).

## Migration

`20261102160000_account_preferences` adds `focus_default_seconds` (default 1500) and `language` (default `en`). Register still creates preferences with Prisma defaults, including `system` theme and Monday week start.
