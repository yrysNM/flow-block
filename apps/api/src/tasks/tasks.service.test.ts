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
  scheduledStart: Date | null
  scheduledEnd: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  recurrence: 'NONE' | 'DAILY' | 'WEEKLY'
  tags: { tag: { id: string; name: string } }[]
  subtasks: { id: string; taskId: string; title: string; completed: boolean; position: number }[]
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
    scheduledStart: null,
    scheduledEnd: null,
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
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
    },
    tag: {
      findFirst: vi.fn(),
    },
    taskTag: {
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    subtask: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
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
    expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId,
        title: 'Ship the slice',
        status: 'TODO',
        isUrgent: true,
        isImportant: true,
        recurrence: 'NONE',
      }),
    }))
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
    expect(prisma.task.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: taskRecord().id, userId },
    }))
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

  it('rejects a category the session user does not own', async () => {
    const categoryId = '44444444-4444-4444-8444-444444444444'
    prisma.category.findFirst.mockResolvedValue(null)
    await expect(service.create(userId, { title: 'Foreign', categoryId })).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.task.create).not.toHaveBeenCalled()
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: categoryId, userId },
      select: { id: true },
    })
  })

  it('filters by search, priority, and uncategorized tasks', async () => {
    prisma.task.count.mockResolvedValue(0)
    prisma.task.findMany.mockResolvedValue([])
    await service.list(userId, {
      priority: 'HIGH',
      categoryId: 'none',
      q: 'spec',
      sort: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: 20,
    })
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId,
        priority: 'HIGH',
        categoryId: null,
        OR: [
          { title: { contains: 'spec', mode: 'insensitive' } },
          { description: { contains: 'spec', mode: 'insensitive' } },
        ],
      },
    }))
  })

  it('ignores a blank search so the owner filter stays exact', async () => {
    prisma.task.count.mockResolvedValue(0)
    prisma.task.findMany.mockResolvedValue([])
    await service.list(userId, {
      q: '   ',
      sort: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: 20,
    })
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId },
    }))
  })

  it('moves a kanban card by status only and keeps eisenhower flags', async () => {
    const current = taskRecord({ status: 'TODO', isUrgent: true, isImportant: false })
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, status: 'IN_PROGRESS' })
    prisma.task.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.updateStatus(userId, current.id, 'IN_PROGRESS')
    const data = prisma.task.updateMany.mock.calls[0]?.[0].data as {
      status: string
      isUrgent: boolean
      isImportant: boolean
    }
    expect(data.status).toBe('IN_PROGRESS')
    expect(data.isUrgent).toBe(true)
    expect(data.isImportant).toBe(false)
    expect(updated.status).toBe('IN_PROGRESS')
    expect(updated.quadrant).toBe('DELEGATE')
  })

  it('returns kanban counts separately from the cards loaded in each column', async () => {
    prisma.task.groupBy.mockResolvedValue([
      { status: 'TODO', _count: { _all: 4 } },
      { status: 'COMPLETED', _count: { _all: 1 } },
    ])
    prisma.task.findMany.mockImplementation(async ({ where }: { where: { status?: TaskStatus } }) => {
      if (where.status === 'TODO') return [taskRecord({ status: 'TODO', isUrgent: true, isImportant: false })]
      return []
    })
    const board = await service.board(userId, {})
    expect(prisma.task.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId } }))
    expect(board.counts).toEqual({ TODO: 4, IN_PROGRESS: 0, COMPLETED: 1, total: 5 })
    expect(board.columns.map((column) => column.status)).toEqual(['TODO', 'IN_PROGRESS', 'COMPLETED'])
    expect(board.columns[0]?.count).toBe(4)
    expect(board.columns[0]?.tasks).toHaveLength(1)
    expect(board.columns[0]?.tasks[0]?.isImportant).toBe(false)
  })

  it('does not attach a tag owned by someone else', async () => {
    const tagId = '55555555-5555-4555-8555-555555555555'
    prisma.task.findFirst.mockResolvedValue(taskRecord())
    prisma.tag.findFirst.mockResolvedValue(null)
    await expect(service.attachTag(userId, taskRecord().id, tagId)).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.taskTag.create).not.toHaveBeenCalled()
    expect(prisma.tag.findFirst).toHaveBeenCalledWith({
      where: { id: tagId, userId },
      select: { id: true },
    })
  })

  it('attaches a tag with the session user id', async () => {
    const tagId = '55555555-5555-4555-8555-555555555555'
    prisma.task.findFirst.mockResolvedValue(taskRecord())
    prisma.tag.findFirst.mockResolvedValue({ id: tagId })
    prisma.taskTag.findFirst.mockResolvedValue(null)
    prisma.taskTag.create.mockResolvedValue({ taskId: taskRecord().id, tagId, userId })

    await service.attachTag(userId, taskRecord().id, tagId)

    expect(prisma.taskTag.create).toHaveBeenCalledWith({
      data: { taskId: taskRecord().id, tagId, userId },
    })
    expect(JSON.stringify(prisma.taskTag.create.mock.calls)).not.toContain(otherUserId)
  })

  it('toggles a subtask without rewriting the parent task', async () => {
    const subtaskId = '66666666-6666-4666-8666-666666666666'
    prisma.subtask.findFirst.mockResolvedValue({
      id: subtaskId,
      userId,
      taskId: taskRecord().id,
      title: 'Draft',
      completed: false,
      position: 0,
      createdAt: new Date('2026-11-02T00:00:00.000Z'),
      updatedAt: new Date('2026-11-02T00:00:00.000Z'),
    })
    prisma.subtask.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.updateSubtask(userId, taskRecord().id, subtaskId, { completed: true })

    expect(prisma.subtask.updateMany).toHaveBeenCalledWith({
      where: { id: subtaskId, taskId: taskRecord().id, userId },
      data: { completed: true },
    })
    expect(updated.completed).toBe(true)
    expect(prisma.task.updateMany).not.toHaveBeenCalled()
    expect(prisma.task.update).not.toHaveBeenCalled()
  })

  it('changes quadrant flags without writing status', async () => {
    const current = taskRecord({ status: 'IN_PROGRESS', isUrgent: false, isImportant: false })
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, isUrgent: true, isImportant: true })
    prisma.task.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.updateQuadrant(userId, current.id, { isUrgent: true, isImportant: true })

    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: current.id, userId },
      data: { isUrgent: true, isImportant: true },
    })
    const data = prisma.task.updateMany.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(data).not.toHaveProperty('status')
    expect(updated.status).toBe('IN_PROGRESS')
    expect(updated.quadrant).toBe('DO')
  })

  it('schedules the same task instead of creating another', async () => {
    const current = taskRecord({ status: 'TODO', isUrgent: true, isImportant: false })
    const scheduledStart = new Date('2026-11-02T09:00:00.000Z')
    const scheduledEnd = new Date('2026-11-02T10:00:00.000Z')
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, scheduledStart, scheduledEnd })
    prisma.task.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.updateSchedule(userId, current.id, {
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
    }, 'UTC')

    expect(prisma.task.create).not.toHaveBeenCalled()
    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: current.id, userId },
      data: { scheduledStart, scheduledEnd },
    })
    const data = prisma.task.updateMany.mock.calls[0]?.[0].data as Record<string, unknown>
    expect(data).not.toHaveProperty('status')
    expect(data).not.toHaveProperty('isUrgent')
    expect(data).not.toHaveProperty('isImportant')
    expect(updated.id).toBe(current.id)
    expect(updated.status).toBe('TODO')
    expect(updated.quadrant).toBe('DELEGATE')
  })

  it('keeps unscheduled tasks off the planner timeline', async () => {
    const scheduled = taskRecord({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      scheduledStart: new Date('2026-11-02T15:00:00.000Z'),
      scheduledEnd: new Date('2026-11-02T16:00:00.000Z'),
    })
    const loose = taskRecord({ scheduledStart: null, scheduledEnd: null })
    prisma.task.count.mockImplementation(async ({ where }: { where: { scheduledStart?: unknown } }) => (
      where.scheduledStart === null ? 2 : 1
    ))
    prisma.task.findMany.mockImplementation(async ({ where }: { where: { scheduledStart?: unknown } }) => (
      where.scheduledStart === null ? [loose] : [scheduled]
    ))

    const page = await service.planner(userId, '2026-11-02', 'UTC')

    expect(page.timeline.map((task) => task.id)).toEqual([scheduled.id])
    expect(page.unscheduled.map((task) => task.id)).toEqual([loose.id])
    expect(page.timeline.some((task) => task.scheduledStart === null)).toBe(false)
    expect(page.counts).toEqual({ timeline: 1, unscheduled: 2 })
  })

  it('creates one next-day TODO when a daily task is completed and leaves the original completed', async () => {
    const categoryId = '44444444-4444-4444-8444-444444444444'
    const tagId = '55555555-5555-4555-8555-555555555555'
    const current = taskRecord({
      description: 'Chapter notes',
      priority: 'HIGH',
      isUrgent: true,
      isImportant: true,
      deadline: new Date('2026-11-02T15:00:00.000Z'),
      scheduledStart: new Date('2026-11-02T15:00:00.000Z'),
      scheduledEnd: new Date('2026-11-02T16:00:00.000Z'),
      categoryId,
      recurrence: 'DAILY',
      tags: [{ tag: { id: tagId, name: 'Writing' } }],
      subtasks: [{
        id: '66666666-6666-4666-8666-666666666666',
        taskId: '11111111-1111-4111-8111-111111111111',
        title: 'Outline',
        completed: true,
        position: 0,
      }],
    })
    const completed = { ...current, status: 'COMPLETED' as const, completedAt: new Date('2026-11-02T18:00:00.000Z') }
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(completed)
    prisma.task.updateMany.mockResolvedValue({ count: 1 })
    prisma.task.create.mockResolvedValue({ id: '77777777-7777-4777-8777-777777777777' })

    const updated = await service.updateStatus(userId, current.id, 'COMPLETED', 'UTC')

    expect(updated.id).toBe(current.id)
    expect(updated.status).toBe('COMPLETED')
    expect(prisma.task.updateMany.mock.calls[0]?.[0].data.status).toBe('COMPLETED')
    expect(prisma.task.create).toHaveBeenCalledTimes(1)
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        recurredFromId: current.id,
        title: 'Write spec',
        description: 'Chapter notes',
        status: 'TODO',
        priority: 'HIGH',
        isUrgent: true,
        isImportant: true,
        categoryId,
        recurrence: 'DAILY',
        deadline: new Date('2026-11-03T15:00:00.000Z'),
        scheduledStart: new Date('2026-11-03T15:00:00.000Z'),
        scheduledEnd: new Date('2026-11-03T16:00:00.000Z'),
        completedAt: null,
        tags: { create: [{ userId, tagId }] },
        subtasks: { create: [{ userId, title: 'Outline', completed: false, position: 0 }] },
      }),
    })
  })

  it('does not create a second successor when the same task is completed again', async () => {
    const current = taskRecord({
      recurrence: 'DAILY',
      deadline: new Date('2026-11-02T15:00:00.000Z'),
    })
    const completed = { ...current, status: 'COMPLETED' as const, completedAt: new Date('2026-11-02T18:00:00.000Z') }
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce({ id: '77777777-7777-4777-8777-777777777777' })
      .mockResolvedValueOnce(completed)
    prisma.task.updateMany.mockResolvedValue({ count: 1 })
    prisma.task.create.mockResolvedValue({ id: '77777777-7777-4777-8777-777777777777' })

    await service.updateStatus(userId, current.id, 'COMPLETED', 'UTC')
    await service.updateStatus(userId, current.id, 'COMPLETED', 'UTC')

    expect(prisma.task.create).toHaveBeenCalledTimes(1)
  })

  it('does not create a task when a non-recurring task is completed', async () => {
    const current = taskRecord({ recurrence: 'NONE', deadline: new Date('2026-11-02T15:00:00.000Z') })
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, status: 'COMPLETED', completedAt: new Date('2026-11-02T18:00:00.000Z') })
    prisma.task.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.updateStatus(userId, current.id, 'COMPLETED', 'UTC')

    expect(updated.status).toBe('COMPLETED')
    expect(prisma.task.create).not.toHaveBeenCalled()
  })

  it('schedules a weekly successor seven days ahead', async () => {
    const current = taskRecord({
      recurrence: 'WEEKLY',
      deadline: new Date('2026-11-02T15:00:00.000Z'),
    })
    prisma.task.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...current, status: 'COMPLETED', completedAt: new Date('2026-11-02T18:00:00.000Z') })
    prisma.task.updateMany.mockResolvedValue({ count: 1 })
    prisma.task.create.mockResolvedValue({ id: '77777777-7777-4777-8777-777777777777' })

    await service.updateStatus(userId, current.id, 'COMPLETED', 'UTC')

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'TODO',
        recurrence: 'WEEKLY',
        deadline: new Date('2026-11-09T15:00:00.000Z'),
        recurredFromId: current.id,
      }),
    })
  })
})
