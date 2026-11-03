import { NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deriveGoalProgress } from '@focusflow/shared-utils'
import type { PrismaService } from '../prisma/prisma.service'
import { GoalsService } from './goals.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'
const goalId = '55555555-5555-4555-8555-555555555555'
const milestoneId = '66666666-6666-4666-8666-666666666666'
const taskId = '77777777-7777-4777-8777-777777777777'

function milestone(completed: boolean) {
  return {
    id: milestoneId,
    userId,
    goalId,
    title: 'Draft',
    completed,
    position: 0,
    dueDate: null,
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  }
}

function goal(completed: boolean) {
  return {
    id: goalId,
    userId,
    title: 'Ship the slice',
    description: null,
    status: 'ACTIVE' as const,
    targetDate: new Date('2026-12-01T00:00:00.000Z'),
    createdAt: new Date('2026-11-01T00:00:00.000Z'),
    updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    milestones: [milestone(completed)],
    goalTasks: [
      {
        task: { id: taskId, title: 'Write tests', status: 'TODO' as const },
      },
    ],
  }
}

function createPrisma() {
  return {
    goal: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    milestone: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
    },
    goalTask: {
      create: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}

describe('GoalsService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: GoalsService

  beforeEach(() => {
    prisma = createPrisma()
    service = new GoalsService(prisma as unknown as PrismaService)
  })

  it('creates and lists goals for the signed-in user only', async () => {
    prisma.goal.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...goal(false),
      ...data,
      milestones: [],
      goalTasks: [],
    }))
    const created = await service.create(userId, { title: 'Ship the slice', deadline: '2026-12-01' })
    expect(prisma.goal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId,
        title: 'Ship the slice',
        targetDate: new Date('2026-12-01T00:00:00.000Z'),
      }),
    }))
    expect(created.progress).toEqual({ completed: 0, total: 0 })
    expect(created).not.toHaveProperty('percentage')
    expect(JSON.stringify(prisma.goal.create.mock.calls[0]?.[0].data)).not.toContain('progress')
    expect(JSON.stringify(prisma.goal.create.mock.calls)).not.toContain(otherUserId)

    prisma.goal.findMany.mockResolvedValue([goal(false)])
    await service.list(userId)
    expect(prisma.goal.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }))

    prisma.goal.findFirst.mockResolvedValue(null)
    await expect(service.update(userId, goalId, { title: 'Other' })).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.goal.updateMany).not.toHaveBeenCalled()
    expect(prisma.goal.update).not.toHaveBeenCalled()
  })

  it('changes derived progress when a milestone is completed and does not store a percentage', async () => {
    const before = deriveGoalProgress({
      milestones: [{ completed: false }],
      linkedTasks: [{ status: 'TODO' }],
    })
    prisma.goal.findFirst.mockResolvedValueOnce(goal(false)).mockResolvedValueOnce(goal(true))
    prisma.milestone.findFirst.mockResolvedValue(milestone(false))
    prisma.milestone.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.updateMilestone(userId, goalId, milestoneId, { completed: true })

    expect(prisma.milestone.updateMany).toHaveBeenCalledWith({
      where: { id: milestoneId, goalId, userId },
      data: { completed: true },
    })
    const written = prisma.milestone.updateMany.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(written).not.toHaveProperty('progress')
    expect(written).not.toHaveProperty('percentage')
    expect(prisma.goal.update).not.toHaveBeenCalled()
    expect(prisma.goal.updateMany).not.toHaveBeenCalled()
    expect(updated.progress.completed).toBe(before.completed + 1)
    expect(updated.progress).toEqual({ completed: 1, total: 2 })
  })
})
