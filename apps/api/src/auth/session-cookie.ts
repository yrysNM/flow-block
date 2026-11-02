export const SESSION_COOKIE = 'ff_session'
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000

export function readSessionToken(request: {
  cookies?: Record<string, unknown>
  headers?: { authorization?: string | undefined }
}): string | undefined {
  const header = request.headers?.authorization
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    if (token.length > 0) return token
  }
  const cookie = request.cookies?.[SESSION_COOKIE]
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : undefined
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_MS,
  }
}
