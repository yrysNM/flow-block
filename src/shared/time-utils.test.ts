import { describe, expect, it } from 'vitest'
import {
  clampElapsedSeconds,
  computeElapsedSeconds,
  formatCompact,
  formatDuration,
  isLimitReached,
  localDateKey,
  remainingSeconds,
  usageRatio,
} from './time-utils'

describe('formatDuration', () => {
  it('formats seconds in a human-friendly way', () => {
    expect(formatDuration(12 * 60)).toBe('12 min')
    expect(formatDuration(45 * 60)).toBe('45 min')
    expect(formatDuration(72 * 60)).toBe('1h 12m')
    expect(formatDuration(0)).toBe('0 min')
  })
})

describe('formatCompact', () => {
  it('uses compact units for cards', () => {
    expect(formatCompact(42 * 60)).toBe('42m')
    expect(formatCompact(60 * 60)).toBe('1h')
    expect(formatCompact(72 * 60)).toBe('1h 12m')
  })
})

describe('elapsed time', () => {
  it('computes elapsed seconds from timestamps', () => {
    expect(computeElapsedSeconds(1_000, 6_000)).toBe(5)
    expect(computeElapsedSeconds(6_000, 1_000)).toBe(0)
  })

  it('drops huge gaps that likely mean sleep or suspension', () => {
    expect(clampElapsedSeconds(20, 300)).toBe(20)
    expect(clampElapsedSeconds(400, 300)).toBe(0)
  })
})

describe('daily limits', () => {
  it('knows when a limit is reached and how much remains', () => {
    expect(isLimitReached(60 * 60, 60)).toBe(true)
    expect(isLimitReached(59 * 60, 60)).toBe(false)
    expect(remainingSeconds(42 * 60, 60)).toBe(18 * 60)
    expect(usageRatio(30 * 60, 60)).toBe(0.5)
  })
})

describe('localDateKey', () => {
  it('uses the local calendar date', () => {
    const date = new Date(2026, 8, 12, 23, 59, 0)
    expect(localDateKey(date)).toBe('2026-09-12')
  })
})
