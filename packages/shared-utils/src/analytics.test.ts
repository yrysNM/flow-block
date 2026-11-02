import { describe, expect, it } from 'vitest'
import { buildAnalytics } from './index'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'
const now = new Date('2026-11-04T15:00:00.000Z')

function input(overrides: Partial<Parameters<typeof buildAnalytics>[0]> = {}) {
  return {
    userId,
    timeZone: 'UTC',
    weekStartsOn: 1,
    rangeDays: 7 as const,
    now,
    tasks: [],
    focusSessions: [],
    websiteUsages: [],
    habits: [],
    ...overrides,
  }
}

describe('buildAnalytics', () => {
  it('counts completed tasks for the signed-in user only', () => {
    const result = buildAnalytics(input({
      tasks: [
        { userId, status: 'COMPLETED', completedAt: new Date('2026-11-04T12:00:00.000Z') },
        { userId: otherUserId, status: 'COMPLETED', completedAt: new Date('2026-11-04T12:00:00.000Z') },
        { userId, status: 'TODO', completedAt: new Date('2026-11-03T12:00:00.000Z') },
        { userId, status: 'COMPLETED', completedAt: new Date('2026-10-01T12:00:00.000Z') },
      ],
    }))
    expect(result.tasksCompleted).toBe(1)
    expect(result.series.find((point) => point.date === '2026-11-04')?.tasksCompleted).toBe(1)
  })

  it('excludes paused intervals from focus time', () => {
    const result = buildAnalytics(input({
      focusSessions: [
        {
          userId,
          startedAt: new Date('2026-11-04T10:00:00.000Z'),
          endedAt: new Date('2026-11-04T10:25:00.000Z'),
          pausedAt: null,
          pausedSeconds: 300,
        },
        {
          userId: otherUserId,
          startedAt: new Date('2026-11-04T10:00:00.000Z'),
          endedAt: new Date('2026-11-04T11:00:00.000Z'),
          pausedAt: null,
          pausedSeconds: 0,
        },
      ],
    }))
    expect(result.focusSeconds).toBe(20 * 60)
    expect(result.series.find((point) => point.date === '2026-11-04')?.focusSeconds).toBe(20 * 60)
  })

  it('keeps a zero for a day with no rows', () => {
    const result = buildAnalytics(input({
      tasks: [
        { userId, status: 'COMPLETED', completedAt: new Date('2026-11-04T12:00:00.000Z') },
      ],
    }))
    expect(result.series).toHaveLength(7)
    expect(result.series.map((point) => point.date)).toEqual([
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ])
    expect(result.series[0]).toEqual({
      date: '2026-10-29',
      tasksCompleted: 0,
      focusSeconds: 0,
      websiteUsedSeconds: 0,
      habitCheckIns: 0,
      habitExpected: 0,
    })
  })
})
