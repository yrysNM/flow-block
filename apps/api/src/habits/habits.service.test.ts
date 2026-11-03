import { NotFoundException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { HabitsService } from './habits.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'
const habitId = '55555555-5555-4555-8555-555555555555'
const entryId = '66666666-6666-4666-8666-666666666666'

function entry(date: string, count: number, id = entryId) {
  return {
    id,
    userId,
    habitId,
    entryDate: new Date(`${date}T00:00:00.000Z`),
    count,
    completed: count >= 1,
    createdAt: new Date(`${date}T00:00:00.000Z`),
  }
}

function habit(entries: ReturnType<typeof entry>[] = []) {
  return {
    id: habitId,
    userId,
    name: 'Read',
    frequency: 'DAILY' as const,
    targetCount: 1,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    entries,
  }
}

function createPrisma() {
  return {
    habit: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    habitEntry: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  }
}

describe('HabitsService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: HabitsService

  beforeEach(() => {
    prisma = createPrisma()
    service = new HabitsService(prisma as unknown as PrismaService)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-04T15:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a habit for the signed-in user and hides another user id', async () => {
    prisma.habit.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...habit(),
      ...data,
      entries: [],
    }))
    const created = await service.create(userId, { name: 'Read' }, 'UTC', 1)
    expect(prisma.habit.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId, name: 'Read', frequency: 'DAILY', targetCount: 1 }),
    }))
    expect(created.streak).toBe(0)
    expect(JSON.stringify(prisma.habit.create.mock.calls)).not.toContain(otherUserId)

    prisma.habit.findFirst.mockResolvedValue(null)
    await expect(service.update(userId, habitId, { name: 'Write' }, 'UTC', 1)).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.habit.updateMany).not.toHaveBeenCalled()
  })

  it('updates the existing entry when the same habit and date are checked in again', async () => {
    const existing = entry('2026-11-04', 1)
    prisma.habit.findFirst
      .mockResolvedValueOnce(habit([existing]))
      .mockResolvedValueOnce(habit([{ ...existing, count: 2 }]))
    prisma.habitEntry.findFirst.mockResolvedValue(existing)
    prisma.habitEntry.updateMany.mockResolvedValue({ count: 1 })

    const result = await service.checkIn(userId, habitId, {}, 'UTC', 1)

    expect(prisma.habitEntry.create).not.toHaveBeenCalled()
    expect(prisma.habitEntry.updateMany).toHaveBeenCalledWith({
      where: { id: entryId, habitId, userId },
      data: { count: 2, completed: true },
    })
    expect(result.entry.id).toBe(entryId)
    expect(result.entry.count).toBe(2)
    expect(result.habit.todayCount).toBe(2)
  })

  it('updates after a unique conflict instead of leaving a second entry', async () => {
    const raced = entry('2026-11-04', 1)
    prisma.habit.findFirst
      .mockResolvedValueOnce(habit([]))
      .mockResolvedValueOnce(habit([{ ...raced, count: 2 }]))
    prisma.habitEntry.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(raced)
    prisma.habitEntry.create.mockRejectedValue({ code: 'P2002' })
    prisma.habitEntry.updateMany.mockResolvedValue({ count: 1 })

    const result = await service.checkIn(userId, habitId, {}, 'UTC', 1)

    expect(prisma.habitEntry.create).toHaveBeenCalledTimes(1)
    expect(prisma.habitEntry.updateMany).toHaveBeenCalledWith({
      where: { id: entryId, habitId, userId },
      data: { count: 2, completed: true },
    })
    expect(result.entry.id).toBe(entryId)
    expect(result.entry.count).toBe(2)
  })

  it('reports a broken daily streak when yesterday was missed', async () => {
    prisma.habit.findMany.mockResolvedValue([
      habit([entry('2026-11-01', 1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), entry('2026-11-02', 1, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')]),
    ])
    const rows = await service.list(userId, 'UTC', 1)
    expect(prisma.habit.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }))
    expect(rows[0]?.streak).toBe(0)
  })
})
