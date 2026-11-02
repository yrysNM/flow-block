import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TaskPriority, TaskStatus } from '@focusflow/shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { TasksService } from './tasks.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'

function taskRecord(overrides: Partial<{
  id: string
  userId: string
  categoryId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  isUrgent: boolean
  isImportant: boolean
  deadline: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId,
    categoryId: null,
    title: 'Write spec',
    description: null,
    status: 'TODO' as TaskStatus,
    priority: 'MEDIUM' as TaskPriority,
    isUrgent: false,
    isImportant: false,
    deadline: null,
    completedAt: null,
    createdAt: new Date('2026-11-02T00:00:00.000Z'),
    updatedAt: new Date('2026-11-02T00:00:00.000Z'),
    ...overrides,
  }
}

function createPrisma() {
  return {
    task: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  }
}

describe('TasksService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: TasksService

  beforeEach(() => {
    prisma = createPrisma()
    service = new TasksService(prisma as unknown as PrismaService)
  })

  it('creates a task for the authenticated user and ignores any foreign owner', async () => {
    prisma.task.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...taskRecord(),
      ...data,
    }))
    const created = await service.create(userId, {
      title: 'Ship the slice',
      isUrgent: true,
      isImportant: true,
    })
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        title: 'Ship the slice',
        status: 'TODO',
        isUrgent: true,
        isImportant: true,
      }),
    })
    expect(created.quadrant).toBe('DO')
    expect(created.status).toBe('TODO')
    expect(JSON.stringify(prisma.task.create.mock.calls)).not.toContain(otherUserId)
  })

  it('lists only the owner rows and keeps the status filter', async () => {
    prisma.task.count.mockResolvedValue(1)
    prisma.task.findMany.mockResolvedValue([taskRecord()])
    const page = await service.list(userId, {
      status: 'TODO',
      sort: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: 20,
    })
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId, status: 'TODO' },
    }))
    expect(page.meta.total).toBe(1)
    expect(page.data[0]?.quadrant).toBe('ELIMINATE')
  })

  it('does not change status when only the quadrant flags change', async () => {
    const current = taskRecord({ status: 'IN_PROGRESS' })
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, isUrgent: true, isImportant: false })
    prisma.task.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.update(userId, current.id, { isUrgent: true, isImportant: false })

    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: current.id, userId },
      data: expect.objectContaining({
        status: 'IN_PROGRESS',
        isUrgent: true,
        isImportant: false,
      }),
    })
    expect(updated.status).toBe('IN_PROGRESS')
    expect(updated.quadrant).toBe('DELEGATE')
  })

  it('rejects an illegal status transition and does not write', async () => {
    prisma.task.findFirst.mockResolvedValue(taskRecord({ status: 'COMPLETED', completedAt: new Date() }))
    await expect(service.updateStatus(userId, taskRecord().id, 'IN_PROGRESS')).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.task.updateMany).not.toHaveBeenCalled()
  })

  it('hides another user’s task', async () => {
    prisma.task.findFirst.mockResolvedValue(null)
    await expect(service.get(userId, taskRecord().id)).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.task.findFirst).toHaveBeenCalledWith({ where: { id: taskRecord().id, userId } })
  })

  it('sets completedAt only when status becomes completed', async () => {
    const current = taskRecord()
    prisma.task.findFirst.mockResolvedValueOnce(current).mockResolvedValueOnce({
      ...current,
      status: 'COMPLETED',
      completedAt: new Date('2026-11-02T12:00:00.000Z'),
    })
    prisma.task.updateMany.mockResolvedValue({ count: 1 })
    await service.updateStatus(userId, current.id, 'COMPLETED')
    const data = prisma.task.updateMany.mock.calls[0]?.[0].data as { status: string; completedAt: Date | null }
    expect(data.status).toBe('COMPLETED')
    expect(data.completedAt).toBeInstanceOf(Date)
  })
})
