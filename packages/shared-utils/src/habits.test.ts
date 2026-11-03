import { describe, expect, it } from 'vitest'
import { currentHabitStreak } from './habits'

describe('currentHabitStreak', () => {
  it('breaks a daily streak when a day was missed', () => {
    const missed = currentHabitStreak({
      frequency: 'DAILY',
      targetCount: 1,
      today: '2026-11-04',
      entries: [
        { date: '2026-11-01', count: 1 },
        { date: '2026-11-02', count: 1 },
      ],
    })
    expect(missed).toBe(0)

    const brokenToday = currentHabitStreak({
      frequency: 'DAILY',
      targetCount: 1,
      today: '2026-11-04',
      entries: [
        { date: '2026-11-01', count: 1 },
        { date: '2026-11-02', count: 1 },
        { date: '2026-11-04', count: 1 },
      ],
    })
    expect(brokenToday).toBe(1)

    const openToday = currentHabitStreak({
      frequency: 'DAILY',
      targetCount: 1,
      today: '2026-11-04',
      entries: [
        { date: '2026-11-01', count: 1 },
        { date: '2026-11-02', count: 1 },
        { date: '2026-11-03', count: 1 },
      ],
    })
    expect(openToday).toBe(3)
  })

  it('counts a weekly streak from summed check-ins and the week start', () => {
    const metThisWeek = currentHabitStreak({
      frequency: 'WEEKLY',
      targetCount: 2,
      today: '2026-11-04',
      weekStartsOn: 1,
      entries: [
        { date: '2026-11-02', count: 1 },
        { date: '2026-11-03', count: 1 },
      ],
    })
    expect(metThisWeek).toBe(1)

    const openThisWeek = currentHabitStreak({
      frequency: 'WEEKLY',
      targetCount: 2,
      today: '2026-11-04',
      weekStartsOn: 1,
      entries: [
        { date: '2026-10-26', count: 2 },
        { date: '2026-11-02', count: 1 },
      ],
    })
    expect(openThisWeek).toBe(1)
  })
})
