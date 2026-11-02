import { describe, expect, it } from 'vitest'
import { readSessionToken } from './session-cookie'

describe('readSessionToken', () => {
  it('prefers a bearer token over the session cookie', () => {
    expect(readSessionToken({
      cookies: { ff_session: 'cookie-token' },
      headers: { authorization: 'Bearer extension-token' },
    })).toBe('extension-token')
    expect(readSessionToken({ cookies: { ff_session: 'cookie-token' } })).toBe('cookie-token')
    expect(readSessionToken({ headers: { authorization: 'Basic abc' } })).toBeUndefined()
  })
})