import { describe, expect, it } from 'vitest'
import {
  DEV_SESSION_SECRET,
  ProductionSessionSecretError,
  resolveSessionSecret,
} from './session-secret'

const PRODUCTION_SECRET = 'a'.repeat(32)

describe('session secret', () => {
  it('uses the development pepper when SESSION_SECRET is unset', () => {
    expect(resolveSessionSecret({ NODE_ENV: 'development' })).toBe(DEV_SESSION_SECRET)
    expect(resolveSessionSecret({ NODE_ENV: 'test' })).toBe(DEV_SESSION_SECRET)
  })

  it('refuses to boot in production with an empty or default secret', () => {
    expect(() => resolveSessionSecret({ NODE_ENV: 'production' })).toThrow(ProductionSessionSecretError)
    expect(() => resolveSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: '   ' })).toThrow(
      ProductionSessionSecretError,
    )
    expect(() => resolveSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'change-me' })).toThrow(
      ProductionSessionSecretError,
    )
    expect(() => resolveSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: DEV_SESSION_SECRET })).toThrow(
      ProductionSessionSecretError,
    )
    expect(() => resolveSessionSecret({
      NODE_ENV: 'production',
      SESSION_SECRET: 'replace-with-a-long-random-session-secret',
    })).toThrow(ProductionSessionSecretError)
    expect(() => resolveSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: 'short-but-not-listed' })).toThrow(
      ProductionSessionSecretError,
    )
  })

  it('accepts a long non-default secret in production', () => {
    expect(resolveSessionSecret({ NODE_ENV: 'production', SESSION_SECRET: `  ${PRODUCTION_SECRET}  ` })).toBe(
      PRODUCTION_SECRET,
    )
  })
})
