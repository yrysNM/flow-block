import { describe, expect, it } from 'vitest'
import { focusElapsedSeconds, focusRemainingSeconds } from './index'

const startedAt = new Date('2026-11-02T12:00:00.000Z')

describe('focus elapsed time', () => {
  it('counts only the time outside pause intervals', () => {
    const elapsed = focusElapsedSeconds({
      startedAt,
      endedAt: null,
      pausedAt: null,
      pausedSeconds: 30,
      now: new Date('2026-11-02T12:00:40.000Z'),
    })
    expect(elapsed).toBe(10)
  })

  it('excludes an open pause from the working time', () => {
    const elapsed = focusElapsedSeconds({
      startedAt,
      endedAt: null,
      pausedAt: new Date('2026-11-02T12:00:10.000Z'),
      pausedSeconds: 0,
      now: new Date('2026-11-02T12:00:40.000Z'),
    })
    expect(elapsed).toBe(10)
  })

  it('stops the clock at endedAt', () => {
    const elapsed = focusElapsedSeconds({
      startedAt,
      endedAt: new Date('2026-11-02T12:00:40.000Z'),
      pausedAt: null,
      pausedSeconds: 30,
      now: new Date('2026-11-02T13:00:00.000Z'),
    })
    expect(elapsed).toBe(10)
  })

  it('floors remaining time at zero when the plan is already used up', () => {
    expect(focusRemainingSeconds(25 * 60, 26 * 60)).toBe(0)
    expect(focusRemainingSeconds(25 * 60, 10)).toBe(25 * 60 - 10)
  })
})
