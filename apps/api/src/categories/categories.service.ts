import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateCategoryInput, UpdateCategoryInput } from '@focusflow/shared-schemas'
import type { CategoryView } from '@focusflow/shared-types'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

interface CategoryRecord {
  id: string
  name: string
  color: string | null
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<CategoryView[]> {
    const rows = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })
    return rows.map((row) => toCategoryView(row))
  }

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryView> {
    await this.assertUniqueName(userId, input.name)
    const created = await this.prisma.category.create({
      data: {
        userId,
        name: input.name,
        color: input.color ?? null,
      },
    })
    return toCategoryView(created)
  }

  async update(userId: string, id: string, input: UpdateCategoryInput): Promise<CategoryView> {
    const current = await this.requireCategory(userId, id)
    if (input.name !== undefined && input.name.toLowerCase() !== current.name.toLowerCase()) {
      await this.assertUniqueName(userId, input.name, id)
    }
    const data: Prisma.CategoryUpdateManyMutationInput = {}
    if (input.name !== undefined) data.name = input.name
    if (input.color !== undefined) data.color = input.color
    const result = await this.prisma.category.updateMany({ where: { id, userId }, data })
    if (result.count !== 1) throw this.missing()
    return toCategoryView(await this.requireCategory(userId, id))
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireCategory(userId, id)
    const result = await this.prisma.category.deleteMany({ where: { id, userId } })
    if (result.count !== 1) throw this.missing()
  }

  private async requireCategory(userId: string, id: string): Promise<CategoryRecord> {
    const category = await this.prisma.category.findFirst({ where: { id, userId } })
    if (!category) throw this.missing()
    return category
  }

  private async assertUniqueName(userId: string, name: string, exceptId?: string): Promise<void> {
    const where: Prisma.CategoryWhereInput = {
      userId,
      name: { equals: name, mode: 'insensitive' },
    }
    if (exceptId) where.id = { not: exceptId }
    const existing = await this.prisma.category.findFirst({ where, select: { id: true } })
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'A category with that name already exists.',
      })
    }
  }

  private missing(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Category not found.',
    })
  }
}

function toCategoryView(row: CategoryRecord): CategoryView {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
