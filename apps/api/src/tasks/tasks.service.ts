import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '@focusflow/shared-schemas'
import {
  InvalidTaskStatusTransitionError,
  applyTaskFieldPatch,
  type TaskStatus,
  type TaskSummary,
} from '@focusflow/shared-types'
import { formatDateInTimeZone, localDayBounds } from '@focusflow/shared-utils'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { completionTimestamp, toTaskView, type TaskRecord } from './task.mapper'

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateTaskInput) {
    await this.assertCategory(userId, input.categoryId)
    const status = input.status ?? 'TODO'
    const created = await this.prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: this.normalizeDescription(input.description),
        status,
        priority: input.priority ?? 'MEDIUM',
        isUrgent: input.isUrgent ?? false,
        isImportant: input.isImportant ?? false,
        deadline: this.parseDeadline(input.deadline),
        categoryId: input.categoryId ?? null,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    })
    return toTaskView(created)
  }

  async list(userId: string, query: ListTasksQuery) {
    const where: Prisma.TaskWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: taskOrderBy(query.sort, query.order),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    return {
      data: rows.map((row) => toTaskView(row)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    }
  }

  async get(userId: string, id: string) {
    return toTaskView(await this.requireTask(userId, id))
  }

  async update(userId: string, id: string, input: UpdateTaskInput) {
    const current = await this.requireTask(userId, id)
    await this.assertCategory(userId, input.categoryId)
    const next = this.applyPatch(current, input)
    const data = {
      title: input.title ?? current.title,
      description: input.description === undefined ? current.description : this.normalizeDescription(input.description),
      status: next.status,
      priority: input.priority ?? current.priority,
      isUrgent: next.isUrgent,
      isImportant: next.isImportant,
      deadline: input.deadline === undefined ? current.deadline : this.parseDeadline(input.deadline),
      categoryId: input.categoryId === undefined ? current.categoryId : input.categoryId,
      completedAt: completionTimestamp(current.status, next.status, current.completedAt),
    }
    const result = await this.prisma.task.updateMany({ where: { id, userId }, data })
    if (result.count !== 1) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found.',
      })
    }
    return toTaskView(await this.requireTask(userId, id))
  }

  async updateStatus(userId: string, id: string, status: TaskStatus) {
    return this.update(userId, id, { status })
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireTask(userId, id)
    const result = await this.prisma.task.deleteMany({ where: { id, userId } })
    if (result.count !== 1) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found.',
      })
    }
  }

  async summary(userId: string, date: string | undefined, timeZone: string): Promise<TaskSummary> {
    const day = date ?? formatDateInTimeZone(new Date(), timeZone)
    const bounds = localDayBounds(day, timeZone)
    const [grouped, today] = await this.prisma.$transaction([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.task.findMany({
        where: { userId, deadline: { gte: bounds.start, lt: bounds.end } },
        orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
      }),
    ])
    const counts: TaskSummary['counts'] = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0, total: 0 }
    for (const row of grouped) {
      counts[row.status] = row._count._all
      counts.total += row._count._all
    }
    return {
      date: day,
      timezone: timeZone,
      counts,
      today: today.map((task) => toTaskView(task)),
    }
  }

  private applyPatch(current: TaskRecord, input: UpdateTaskInput) {
    try {
      return applyTaskFieldPatch(current, {
        status: input.status,
        isUrgent: input.isUrgent,
        isImportant: input.isImportant,
      })
    } catch (error) {
      if (error instanceof InvalidTaskStatusTransitionError) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message,
        })
      }
      throw error
    }
  }

  private async requireTask(userId: string, id: string): Promise<TaskRecord> {
    const task = await this.prisma.task.findFirst({ where: { id, userId } })
    if (!task) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Task not found.',
      })
    }
    return task
  }

  private async assertCategory(userId: string, categoryId: string | null | undefined): Promise<void> {
    if (!categoryId) return
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    })
    if (!category) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Category not found.',
      })
    }
  }

  private normalizeDescription(value: string | null | undefined): string | null {
    if (value === undefined || value === null) return null
    const trimmed = value.trim()
    return trimmed.length === 0 ? null : trimmed
  }

  private parseDeadline(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) return null
    return new Date(value)
  }
}

function taskOrderBy(
  sort: ListTasksQuery['sort'],
  order: ListTasksQuery['order'],
): Prisma.TaskOrderByWithRelationInput {
  switch (sort) {
    case 'updatedAt':
      return { updatedAt: order }
    case 'deadline':
      return { deadline: order }
    case 'priority':
      return { priority: order }
    case 'title':
      return { title: order }
    default:
      return { createdAt: order }
  }
}
