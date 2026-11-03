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

/**
 * Secure cookies follow NODE_ENV=production unless COOKIE_SECURE is set.
 * Local HTTP packaging sets COOKIE_SECURE=0. TLS deployments set COOKIE_SECURE=1.
 */
export function cookieSecure(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.COOKIE_SECURE?.trim().toLowerCase()
  if (flag === '1' || flag === 'true') return true
  if (flag === '0' || flag === 'false') return false
  return env.NODE_ENV === 'production'
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
