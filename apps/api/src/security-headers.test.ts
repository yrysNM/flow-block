import { describe, expect, it } from 'vitest'
import { securityHeaders } from './security-headers'

describe('security headers', () => {
  it('sets the baseline headers and adds HSTS only on HTTPS', () => {
    const plain = securityHeaders(false)
    expect(plain['X-Content-Type-Options']).toBe('nosniff')
    expect(plain['X-Frame-Options']).toBe('DENY')
    expect(plain['Referrer-Policy']).toBe('no-referrer')
    expect(plain['Strict-Transport-Security']).toBeUndefined()

    expect(securityHeaders(true)['Strict-Transport-Security']).toBe('max-age=15552000; includeSubDomains')
  })
})
