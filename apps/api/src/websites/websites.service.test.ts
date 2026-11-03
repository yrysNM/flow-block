import { NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { WebsitesService } from './websites.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'
const ruleId = '55555555-5555-4555-8555-555555555555'
const clientEventId = 'event-1'

function ruleRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: ruleId,
    userId,
    domain: 'example.com',
    mode: 'BLOCK' as const,
    enabled: true,
    dailyLimitMinutes: null as number | null,
    scheduleStartMinute: null as number | null,
    scheduleEndMinute: null as number | null,
    createdAt: new Date('2026-11-02T00:00:00.000Z'),
    updatedAt: new Date('2026-11-02T00:00:00.000Z'),
    ...overrides,
  }
}

function createPrisma() {
  return {
    websiteRule: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    websiteUsage: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    websiteUsageEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  }
}

describe('WebsitesService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: WebsitesService

  beforeEach(() => {
    prisma = createPrisma()
    service = new WebsitesService(prisma as unknown as PrismaService)
  })

  it('creates and lists rules for the signed-in user only', async () => {
    prisma.websiteRule.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ruleRecord(data))
    const created = await service.create(userId, { domain: 'https://www.Example.com/path', mode: 'ALLOW' })
    expect(prisma.websiteRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        domain: 'example.com',
        mode: 'ALLOW',
      }),
    })
    expect(created.domain).toBe('example.com')
    expect(JSON.stringify(prisma.websiteRule.create.mock.calls)).not.toContain(otherUserId)

    prisma.websiteRule.findMany.mockResolvedValue([ruleRecord()])
    await service.list(userId)
    expect(prisma.websiteRule.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { domain: 'asc' },
    })

    prisma.websiteRule.findFirst.mockResolvedValue(null)
    await expect(service.update(userId, ruleId, { enabled: false })).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.websiteRule.findFirst).toHaveBeenCalledWith({ where: { id: ruleId, userId } })
    expect(prisma.websiteRule.updateMany).not.toHaveBeenCalled()
  })

  it('stores a duplicate usage event id once', async () => {
    prisma.websiteUsageEvent.findFirst.mockResolvedValue({
      id: 'evt',
      userId,
      clientEventId,
      websiteRuleId: ruleId,
      domain: 'example.com',
      seconds: 12,
      occurredAt: new Date('2026-11-02T12:00:00.000Z'),
      createdAt: new Date('2026-11-02T12:00:00.000Z'),
    })
    prisma.websiteUsage.findFirst.mockResolvedValue({ usedSeconds: 12 })

    const result = await service.recordEvent(userId, 'UTC', {
      clientEventId,
      domain: 'example.com',
      seconds: 40,
    })

    expect(result.stored).toBe(false)
    expect(result.usedSeconds).toBe(12)
    expect(prisma.websiteUsageEvent.create).not.toHaveBeenCalled()
    expect(prisma.websiteUsage.upsert).not.toHaveBeenCalled()
  })

  it('does not add time when a racing insert hits the same client event id', async () => {
    prisma.websiteUsageEvent.findFirst.mockResolvedValueOnce(null)
    prisma.websiteRule.findMany.mockResolvedValue([ruleRecord()])
    prisma.websiteUsageEvent.create.mockRejectedValue({ code: 'P2002' })
    prisma.websiteUsage.findFirst.mockResolvedValue({ usedSeconds: 12 })

    const result = await service.recordEvent(userId, 'UTC', {
      clientEventId,
      domain: 'example.com',
      seconds: 40,
    })

    expect(result.stored).toBe(false)
    expect(prisma.websiteUsage.upsert).not.toHaveBeenCalled()
  })
})
