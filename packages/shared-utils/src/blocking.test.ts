import { describe, expect, it } from 'vitest'
import { isWithinSchedule, shouldBlockWebsite, type BlockingRule } from './blocking'

function rule(overrides: Partial<BlockingRule> = {}): BlockingRule {
  return {
    enabled: true,
    mode: 'BLOCK',
    domain: 'example.com',
    scheduleStartMinute: 9 * 60,
    scheduleEndMinute: 17 * 60,
    dailyLimitMinutes: null,
    usedSeconds: 0,
    ...overrides,
  }
}

describe('focus mode and schedule', () => {
  it('blocks a blocklist domain during focus even outside the schedule and under the limit', () => {
    const decision = shouldBlockWebsite({
      focusActive: true,
      nowMinute: 8 * 60,
      host: 'https://www.example.com/watch',
      rules: [rule({ dailyLimitMinutes: 30, usedSeconds: 10 })],
    })
    expect(decision).toEqual({ block: true, reason: 'focus' })
  })

  it('leaves the same domain open when focus is off and the clock is outside the schedule', () => {
    const decision = shouldBlockWebsite({
      focusActive: false,
      nowMinute: 8 * 60,
      host: 'example.com',
      rules: [rule()],
    })
    expect(decision).toEqual({ block: false, reason: 'none' })
  })

  it('follows the schedule when no focus session is active', () => {
    const decision = shouldBlockWebsite({
      focusActive: false,
      nowMinute: 10 * 60,
      host: 'news.example.com',
      rules: [rule()],
    })
    expect(decision).toEqual({ block: true, reason: 'schedule' })
  })

  it('allows use inside the schedule until the daily limit is reached', () => {
    const under = shouldBlockWebsite({
      focusActive: false,
      nowMinute: 10 * 60,
      host: 'example.com',
      rules: [rule({ dailyLimitMinutes: 5, usedSeconds: 60 })],
    })
    const over = shouldBlockWebsite({
      focusActive: false,
      nowMinute: 10 * 60,
      host: 'example.com',
      rules: [rule({ dailyLimitMinutes: 5, usedSeconds: 5 * 60 })],
    })
    expect(under).toEqual({ block: false, reason: 'none' })
    expect(over).toEqual({ block: true, reason: 'limit' })
  })

  it('does not block an allowlisted host during focus, even when a block rule matches', () => {
    const decision = shouldBlockWebsite({
      focusActive: true,
      nowMinute: 12 * 60,
      host: 'docs.example.com',
      rules: [rule(), rule({ mode: 'ALLOW', domain: 'docs.example.com' })],
    })
    expect(decision).toEqual({ block: false, reason: 'allowlist' })
  })

  it('ignores a disabled rule and wraps a schedule past midnight', () => {
    expect(isWithinSchedule(23 * 60, 22 * 60, 6 * 60)).toBe(true)
    expect(isWithinSchedule(12 * 60, 22 * 60, 6 * 60)).toBe(false)
    const decision = shouldBlockWebsite({
      focusActive: false,
      nowMinute: 12 * 60,
      host: 'example.com',
      rules: [rule({ enabled: false })],
    })
    expect(decision).toEqual({ block: false, reason: 'none' })
  })
})
