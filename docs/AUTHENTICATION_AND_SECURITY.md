# Authentication and security

- Passwords are hashed with argon2id (`@node-rs/argon2`, memory cost 19456, time cost 2). The hash is the only password material stored
- Register and login set cookie `ff_session`. `HttpOnly`, `SameSite=Lax`, `Path=/`. `Secure` is on when `NODE_ENV=production`, unless `COOKIE_SECURE` is `0` or `false`. `COOKIE_SECURE=1` forces it on
- The cookie value is 32 random bytes, base64url. The database stores HMAC-SHA256 of that value, keyed with `SESSION_SECRET`. Logout deletes that hash. Production refuses to boot when the secret is empty, shorter than 32 characters, or a listed placeholder. See [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)
- Sessions last 14 days. An expired row is deleted on the next use
- The API never accepts `userId` from the body. Zod strips unknown keys
- Login and register failures for a wrong password or an unknown email share the message “Invalid email or password.” A duplicate email on register is a 409
- `PATCH /api/users/me/password` requires the current password. A mismatch is 401 “Current password is incorrect.” and does not write a new hash. A match stores a new argon2id hash and does not delete the session. Email cannot be changed. Password reset by email is still not implemented. See [SETTINGS.md](SETTINGS.md)
- Auth routes are limited to 10 requests per minute per IP and path in a single process. This resets on restart and is not shared across instances
- CORS allows `WEB_ORIGIN` and `chrome-extension://` origins. The supported browser setup is the same-origin proxy, so the cookie does not need `SameSite=None`
- Responses set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-DNS-Prefetch-Control: off`, and a camera/microphone/geolocation `Permissions-Policy`. `Strict-Transport-Security` is set only when the request is HTTPS. `X-Powered-By` stays disabled. Auth routes stay limited to 10 requests per minute per IP and path in one process. There is no Redis
- `POST /api/auth/extension/login` returns the raw session token once for the extension. The web login response does not. The extension stores it in `chrome.storage.local`. Requests may send `Authorization: Bearer` instead of the cookie. Logout accepts either
- Errors do not include stack traces or database URLs
- Health does not check the database, so a process can be up while Postgres is down. Task and auth routes then return 503

Not done: CSRF tokens beyond SameSite=Lax, refresh-token rotation, email verification, password reset, changing the email address, and a shared rate-limit store. Changing the password while signed in is implemented and keeps the current session. The rate limit is still per process.
