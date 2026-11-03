import { describe, expect, it } from 'vitest'
import { cookieSecure, readSessionToken } from './session-cookie'

describe('readSessionToken', () => {
  it('prefers a bearer token over the session cookie', () => {
    expect(readSessionToken({
      cookies: { ff_session: 'cookie-token' },
      headers: { authorization: 'Bearer extension-token' },
    })).toBe('extension-token')
    expect(readSessionToken({ cookies: { ff_session: 'cookie-token' } })).toBe('cookie-token')
    expect(readSessionToken({ headers: { authorization: 'Basic abc' } })).toBeUndefined()
  })

  it('turns on Secure cookies in production unless COOKIE_SECURE says otherwise', () => {
    expect(cookieSecure({ NODE_ENV: 'production' })).toBe(true)
    expect(cookieSecure({ NODE_ENV: 'development' })).toBe(false)
    expect(cookieSecure({ NODE_ENV: 'production', COOKIE_SECURE: '0' })).toBe(false)
    expect(cookieSecure({ NODE_ENV: 'development', COOKIE_SECURE: '1' })).toBe(true)
  })
})