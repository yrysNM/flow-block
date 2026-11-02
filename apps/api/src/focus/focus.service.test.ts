import { BadRequestException, ConflictException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { FocusService } from './focus.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'
const sessionId = '44444444-4444-4444-8444-444444444444'
const taskId = '11111111-1111-4111-8111-111111111111'

function sessionRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: sessionId,
    userId,
    taskId: null as string | null,
    plannedSeconds: 25 * 60,
    elapsedSeconds: 0,
    startedAt: new Date('2026-11-02T12:00:00.000Z'),
    endedAt: null as Date | null,
    pausedAt: null as Date | null,
    pausedSeconds: 0,
    completed: false,
    createdAt: new Date('2026-11-02T12:00:00.000Z'),
    updatedAt: new Date('2026-11-02T12:00:00.000Z'),
    task: null as { id: string; title: string; status: 'TODO' } | null,
    ...overrides,
  }
}

function createPrisma() {
  const prisma = {
    focusSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((input: unknown) => {
    if (typeof input === 'function') return (input as (tx: typeof prisma) => unknown)(prisma)
    return Promise.all(input as Promise<unknown>[])
  })
  return prisma
}

describe('FocusService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: FocusService

  beforeEach(() => {
    prisma = createPrisma()
    service = new FocusService(prisma as unknown as PrismaService)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not create a second active session', async () => {
    const active = sessionRecord({ plannedSeconds: 15 * 60, taskId })
    prisma.focusSession.findFirst.mockResolvedValue(active)

    const result = await service.start(userId, { plannedSeconds: 50 * 60, taskId: null })

    expect(prisma.focusSession.create).not.toHaveBeenCalled()
    expect(result.created).toBe(false)
    expect(result.session.id).toBe(sessionId)
    expect(result.session.plannedSeconds).toBe(15 * 60)
    expect(result.session.taskId).toBe(taskId)
  })

  it('returns the active row when a unique conflict races the insert', async () => {
    const active = sessionRecord()
    prisma.focusSession.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(active)
    prisma.focusSession.create.mockRejectedValue({ code: 'P2002' })

    const result = await service.start(userId, { plannedSeconds: 25 * 60 })

    expect(result.created).toBe(false)
    expect(result.session.id).toBe(sessionId)
  })

  it('creates one session for the signed-in user and does not store elapsed time', async () => {
    prisma.focusSession.findFirst.mockResolvedValue(null)
    prisma.focusSession.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => (
      sessionRecord(data)
    ))

    const result = await service.start(userId, { plannedSeconds: 25 * 60, taskId: null })

    expect(prisma.focusSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        userId,
        taskId: null,
        plannedSeconds: 25 * 60,
        startedAt: new Date('2026-11-02T12:00:00.000Z'),
      },
    }))
    expect(JSON.stringify(prisma.focusSession.create.mock.calls)).not.toContain(otherUserId)
    expect(JSON.stringify(prisma.focusSession.create.mock.calls)).not.toContain('elapsedSeconds')
    expect(result.created).toBe(true)
    expect(result.session.elapsedSeconds).toBe(0)
  })

  it('rejects a task the user does not own', async () => {
    prisma.focusSession.findFirst.mockResolvedValue(null)
    prisma.task.findFirst.mockResolvedValue(null)

    await expect(service.start(userId, { plannedSeconds: 25 * 60, taskId })).rejects.toBeInstanceOf(BadRequestException)
    expect(prisma.focusSession.create).not.toHaveBeenCalled()
  })

  it('pause and resume do not count the paused interval as elapsed', async () => {
    const running = sessionRecord()
    vi.setSystemTime(new Date('2026-11-02T12:00:10.000Z'))
    const paused = sessionRecord({ pausedAt: new Date('2026-11-02T12:00:10.000Z') })
    prisma.focusSession.findFirst
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(paused)
    prisma.focusSession.updateMany.mockResolvedValue({ count: 1 })

    const afterPause = await service.pause(userId, sessionId)

    expect(prisma.focusSession.updateMany).toHaveBeenCalledWith({
      where: { id: sessionId, userId, endedAt: null, pausedAt: null },
      data: { pausedAt: new Date('2026-11-02T12:00:10.000Z') },
    })
    expect(JSON.stringify(prisma.focusSession.updateMany.mock.calls)).not.toContain('elapsedSeconds')
    expect(afterPause.elapsedSeconds).toBe(10)

    vi.setSystemTime(new Date('2026-11-02T12:01:00.000Z'))
    prisma.focusSession.findFirst.mockResolvedValue(paused)
    const stillPaused = await service.pause(userId, sessionId)
    expect(prisma.focusSession.updateMany).toHaveBeenCalledTimes(1)
    expect(stillPaused.elapsedSeconds).toBe(10)

    vi.setSystemTime(new Date('2026-11-02T12:00:40.000Z'))
    const resumed = sessionRecord({ pausedAt: null, pausedSeconds: 30 })
    prisma.focusSession.findFirst
      .mockResolvedValueOnce(paused)
      .mockResolvedValueOnce(resumed)

    const afterResume = await service.resume(userId, sessionId)

    expect(prisma.focusSession.updateMany).toHaveBeenLastCalledWith({
      where: { id: sessionId, userId, endedAt: null, pausedAt: { not: null } },
      data: { pausedAt: null, pausedSeconds: { increment: 30 } },
    })
    expect(afterResume.elapsedSeconds).toBe(10)
    expect(afterResume.status).toBe('RUNNING')
  })

  it('derives elapsed time from timestamps when a session ends', async () => {
    vi.setSystemTime(new Date('2026-11-02T12:00:40.000Z'))
    const paused = sessionRecord({
      pausedAt: new Date('2026-11-02T12:00:10.000Z'),
      pausedSeconds: 0,
      taskId,
      task: { id: taskId, title: 'Write spec', status: 'TODO' as const },
    })
    const ended = sessionRecord({
      ...paused,
      endedAt: new Date('2026-11-02T12:00:40.000Z'),
      pausedAt: null,
      pausedSeconds: 30,
      completed: true,
    })
    prisma.focusSession.findFirst
      .mockResolvedValueOnce(paused)
      .mockResolvedValueOnce(ended)
    prisma.focusSession.updateMany.mockResolvedValue({ count: 1 })

    const view = await service.complete(userId, sessionId)

    expect(view.elapsedSeconds).toBe(10)
    expect(view.remainingSeconds).toBe(25 * 60 - 10)
    expect(view.status).toBe('COMPLETED')
    expect(view.task?.status).toBe('TODO')
    expect(prisma.task.update).not.toHaveBeenCalled()
    expect(prisma.task.updateMany).not.toHaveBeenCalled()
    const written = prisma.focusSession.updateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> }
    expect(written.data).toMatchObject({
      completed: true,
      pausedAt: null,
      pausedSeconds: 30,
      endedAt: new Date('2026-11-02T12:00:40.000Z'),
    })
    expect(written.data).not.toHaveProperty('status')
    expect(prisma.notification.create).toHaveBeenCalledTimes(1)
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId,
        type: 'FOCUS',
        title: 'Focus session completed',
        linkPath: '/focus',
      },
    })
  })

  it('does not insert a second notification when the same session is completed again', async () => {
    const running = sessionRecord()
    const ended = sessionRecord({
      endedAt: new Date('2026-11-02T12:10:00.000Z'),
      completed: true,
    })
    prisma.focusSession.findFirst
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(ended)
      .mockResolvedValueOnce(ended)
    prisma.focusSession.updateMany.mockResolvedValue({ count: 1 })

    await service.complete(userId, sessionId)
    await expect(service.complete(userId, sessionId)).rejects.toBeInstanceOf(ConflictException)

    expect(prisma.notification.create).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(prisma.notification.create.mock.calls)).not.toContain(otherUserId)
  })

  it('lists only the owner’s ended sessions', async () => {
    const ended = sessionRecord({
      endedAt: new Date('2026-11-02T12:00:40.000Z'),
      pausedSeconds: 30,
      completed: false,
    })
    prisma.focusSession.count.mockResolvedValue(1)
    prisma.focusSession.findMany.mockResolvedValue([ended])

    const page = await service.history(userId, { page: 1, pageSize: 20 })

    expect(prisma.focusSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId, endedAt: { not: null } },
      orderBy: { endedAt: 'desc' },
    }))
    expect(page.data).toHaveLength(1)
    expect(page.data[0]?.status).toBe('STOPPED')
    expect(page.data[0]?.elapsedSeconds).toBe(10)
  })
})
