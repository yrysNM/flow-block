export const SESSION_COOKIE = 'ff_session'
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_MS,
  }
}
