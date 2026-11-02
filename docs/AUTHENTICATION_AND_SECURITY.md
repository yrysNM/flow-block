# Authentication and security

- Passwords are hashed with argon2id (`@node-rs/argon2`, memory cost 19456, time cost 2). The hash is the only password material stored
- Register and login set cookie `ff_session`. `HttpOnly`, `SameSite=Lax`, `Path=/`. `Secure` is on when `NODE_ENV=production`
- The cookie value is 32 random bytes, base64url. The database stores SHA-256 of that value. Logout deletes that hash
- Sessions last 14 days. An expired row is deleted on the next use
- The API never accepts `userId` from the body. Zod strips unknown keys
- Login and register failures for a wrong password or an unknown email share the message “Invalid email or password.” A duplicate email on register is a 409
- Auth routes are limited to 10 requests per minute per IP and path in a single process. This resets on restart and is not shared across instances
- CORS allows `WEB_ORIGIN` with credentials. The supported browser setup is the same-origin proxy, so the cookie does not need `SameSite=None`
- Errors do not include stack traces or database URLs
- Health does not check the database, so a process can be up while Postgres is down. Task and auth routes then return 503

Not done: CSRF tokens beyond SameSite=Lax, refresh-token rotation, email verification, password reset, security headers beyond disabling `X-Powered-By`, and a shared rate-limit store.
