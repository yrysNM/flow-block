import { describe, expect, it } from 'vitest'
import { formatDateInTimeZone, isValidTimeZone, localDayBounds } from './index'

describe('local day bounds', () => {
  it('uses UTC midnight for a UTC time zone', () => {
    const bounds = localDayBounds('2026-11-02', 'UTC')
    expect(bounds.start.toISOString()).toBe('2026-11-02T00:00:00.000Z')
    expect(bounds.end.toISOString()).toBe('2026-11-03T00:00:00.000Z')
  })

  it('shifts the civil day for a fixed offset zone', () => {
    const bounds = localDayBounds('2026-11-02', 'America/New_York')
    expect(bounds.start.toISOString()).toBe('2026-11-02T05:00:00.000Z')
    expect(bounds.end.toISOString()).toBe('2026-11-03T05:00:00.000Z')
    expect(formatDateInTimeZone(bounds.start, 'America/New_York')).toBe('2026-11-02')
  })

  it('rejects an unknown time zone', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false)
    expect(() => localDayBounds('2026-11-02', 'Not/AZone')).toThrow()
  })
})
