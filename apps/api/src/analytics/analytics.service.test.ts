import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { AnalyticsService } from './analytics.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'

function createPrisma() {
  return {
    task: { findMany: vi.fn() },
    focusSession: { findMany: vi.fn() },
    websiteUsage: { findMany: vi.fn() },
    habit: { findMany: vi.fn() },
  }
}

describe('AnalyticsService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: AnalyticsService

  beforeEach(() => {
    prisma = createPrisma()
    service = new AnalyticsService(prisma as unknown as PrismaService)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-04T15:00:00.000Z'))
    prisma.task.findMany.mockResolvedValue([
      { userId, status: 'COMPLETED', completedAt: new Date('2026-11-04T12:00:00.000Z') },
      { userId: otherUserId, status: 'COMPLETED', completedAt: new Date('2026-11-04T12:00:00.000Z') },
    ])
    prisma.focusSession.findMany.mockResolvedValue([
      {
        userId,
        startedAt: new Date('2026-11-04T10:00:00.000Z'),
        endedAt: new Date('2026-11-04T10:25:00.000Z'),
        pausedAt: null,
        pausedSeconds: 300,
      },
    ])
    prisma.websiteUsage.findMany.mockResolvedValue([])
    prisma.habit.findMany.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ignores another user’s completed tasks and keeps a zero for an empty day', async () => {
    const result = await service.get(userId, 'UTC', 1, '7')

    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId, status: 'COMPLETED' }),
    }))
    expect(JSON.stringify(prisma.task.findMany.mock.calls)).not.toContain(otherUserId)
    expect(prisma.focusSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId }),
    }))
    expect(result.tasksCompleted).toBe(1)
    expect(result.focusSeconds).toBe(20 * 60)
    expect(result.series).toHaveLength(7)
    expect(result.series[0]).toMatchObject({
      date: '2026-10-29',
      tasksCompleted: 0,
      focusSeconds: 0,
      websiteUsedSeconds: 0,
    })
    expect(result.series.find((point) => point.date === '2026-11-04')).toMatchObject({
      tasksCompleted: 1,
      focusSeconds: 20 * 60,
    })
  })
})
