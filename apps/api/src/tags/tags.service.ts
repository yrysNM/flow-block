import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateTagInput, UpdateTagInput } from '@focusflow/shared-schemas'
import type { TagView } from '@focusflow/shared-types'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

interface TagRecord {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<TagView[]> {
    const rows = await this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })
    return rows.map((row) => toTagView(row))
  }

  async create(userId: string, input: CreateTagInput): Promise<TagView> {
    await this.assertUniqueName(userId, input.name)
    const created = await this.prisma.tag.create({
      data: { userId, name: input.name },
    })
    return toTagView(created)
  }

  async update(userId: string, id: string, input: UpdateTagInput): Promise<TagView> {
    const current = await this.requireTag(userId, id)
    if (input.name.toLowerCase() !== current.name.toLowerCase()) {
      await this.assertUniqueName(userId, input.name, id)
    }
    const result = await this.prisma.tag.updateMany({
      where: { id, userId },
      data: { name: input.name },
    })
    if (result.count !== 1) throw this.missing()
    return toTagView(await this.requireTag(userId, id))
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireTag(userId, id)
    const result = await this.prisma.tag.deleteMany({ where: { id, userId } })
    if (result.count !== 1) throw this.missing()
  }

  private async requireTag(userId: string, id: string): Promise<TagRecord> {
    const tag = await this.prisma.tag.findFirst({ where: { id, userId } })
    if (!tag) throw this.missing()
    return tag
  }

  private async assertUniqueName(userId: string, name: string, exceptId?: string): Promise<void> {
    const where: Prisma.TagWhereInput = {
      userId,
      name: { equals: name, mode: 'insensitive' },
    }
    if (exceptId) where.id = { not: exceptId }
    const existing = await this.prisma.tag.findFirst({ where, select: { id: true } })
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'A tag with that name already exists.',
      })
    }
  }

  private missing(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Tag not found.',
    })
  }
}

function toTagView(row: TagRecord): TagView {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
