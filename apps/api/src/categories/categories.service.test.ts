import { NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaService } from '../prisma/prisma.service'
import { CategoriesService } from './categories.service'

const userId = '22222222-2222-4222-8222-222222222222'
const otherUserId = '33333333-3333-4333-8333-333333333333'
const categoryId = '44444444-4444-4444-8444-444444444444'

function categoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: categoryId,
    userId,
    name: 'Work',
    color: '#3366FF',
    createdAt: new Date('2026-11-02T00:00:00.000Z'),
    updatedAt: new Date('2026-11-02T00:00:00.000Z'),
    ...overrides,
  }
}

function createPrisma() {
  return {
    category: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  }
}

describe('CategoriesService', () => {
  let prisma: ReturnType<typeof createPrisma>
  let service: CategoriesService

  beforeEach(() => {
    prisma = createPrisma()
    service = new CategoriesService(prisma as unknown as PrismaService)
  })

  it('creates a category for the session user', async () => {
    prisma.category.findFirst.mockResolvedValue(null)
    prisma.category.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => categoryRecord(data))

    const created = await service.create(userId, { name: 'Work', color: '#3366FF' })

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { userId, name: 'Work', color: '#3366FF' },
    })
    expect(created.name).toBe('Work')
    expect(JSON.stringify(prisma.category.create.mock.calls)).not.toContain(otherUserId)
  })

  it('updates and deletes only the owner row', async () => {
    prisma.category.findFirst
      .mockResolvedValueOnce(categoryRecord())
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(categoryRecord({ name: 'Deep work' }))
      .mockResolvedValueOnce(categoryRecord())
    prisma.category.updateMany.mockResolvedValue({ count: 1 })
    prisma.category.deleteMany.mockResolvedValue({ count: 1 })

    await service.update(userId, categoryId, { name: 'Deep work' })
    expect(prisma.category.updateMany).toHaveBeenCalledWith({
      where: { id: categoryId, userId },
      data: { name: 'Deep work' },
    })

    await service.remove(userId, categoryId)
    expect(prisma.category.deleteMany).toHaveBeenCalledWith({
      where: { id: categoryId, userId },
    })
  })

  it('returns not found when the category is missing for this user', async () => {
    prisma.category.findFirst.mockResolvedValue(null)
    await expect(service.update(userId, categoryId, { name: 'Nope' })).rejects.toBeInstanceOf(NotFoundException)
    await expect(service.remove(userId, categoryId)).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.category.updateMany).not.toHaveBeenCalled()
    expect(prisma.category.deleteMany).not.toHaveBeenCalled()
  })
})
