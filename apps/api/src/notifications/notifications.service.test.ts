import { NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from './notifications.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'
const notificationId = '88888888-8888-4888-8888-888888888888'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: notificationId,
    userId,
    type: 'FOCUS' as const,
    title: 'Focus session completed',
    body: null,
    linkPath: '/focus',
    readAt: null as Date | null,
    createdAt: new Date('2026-11-02T12:00:00.000Z'),
    ...overrides,
  }
}

function createPrisma() {
  const prisma = {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((input: unknown) => {
    if (typeof input === 'function') return (input as (tx: typeof prisma) => unknown)(prisma)
    return Promise.all(input as Promise<unknown>[])
  })
  return prisma
}

describe('NotificationsService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: NotificationsService

  beforeEach(() => {
    prisma = createPrisma()
    service = new NotificationsService(prisma as unknown as PrismaService)
  })

  it('lists only the signed-in user, newest first, with the unread count', async () => {
    prisma.notification.findMany.mockResolvedValue([row()])
    prisma.notification.count.mockResolvedValue(1)

    const page = await service.list(userId)

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId, readAt: null } })
    expect(page.unreadCount).toBe(1)
    expect(page.data).toEqual([{
      id: notificationId,
      type: 'FOCUS',
      title: 'Focus session completed',
      linkPath: '/focus',
      readAt: null,
      createdAt: '2026-11-02T12:00:00.000Z',
    }])
    expect(JSON.stringify(prisma.notification.findMany.mock.calls)).not.toContain(otherUserId)
  })

  it('marks a notification read for its owner and leaves the first read time on a second call', async () => {
    const unread = row()
    const readAt = new Date('2026-11-02T12:05:00.000Z')
    prisma.notification.findFirst
      .mockResolvedValueOnce(unread)
      .mockResolvedValueOnce({ ...unread, readAt })
      .mockResolvedValueOnce({ ...unread, readAt })
    prisma.notification.updateMany.mockResolvedValue({ count: 1 })

    const first = await service.markRead(userId, notificationId)
    const second = await service.markRead(userId, notificationId)

    expect(first.readAt).toBe(readAt.toISOString())
    expect(second.readAt).toBe(readAt.toISOString())
    expect(prisma.notification.updateMany).toHaveBeenCalledTimes(1)
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })

  it('does not read or mark another user’s notification', async () => {
    prisma.notification.findFirst.mockResolvedValue(null)

    await expect(service.markRead(userId, notificationId)).rejects.toBeInstanceOf(NotFoundException)

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: notificationId, userId } })
    expect(prisma.notification.updateMany).not.toHaveBeenCalled()
    expect(JSON.stringify(prisma.notification.findFirst.mock.calls)).not.toContain(otherUserId)
  })
})
