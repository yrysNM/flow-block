import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  BoardTasksQuery,
  CreateSubtaskInput,
  CreateTaskInput,
  ListTasksQuery,
  ReorderSubtasksInput,
  UpdateSubtaskInput,
  UpdateTaskInput,
  UpdateTaskQuadrantInput,
  UpdateTaskScheduleInput,
} from '@focusflow/shared-schemas'
import {
  EISENHOWER_QUADRANTS,
  InvalidTaskStatusTransitionError,
  TASK_STATUSES,
  applyTaskFieldPatch,
  deriveEisenhowerQuadrant,
  flagsForQuadrant,
  type TaskBoardResponse,
  type TaskMatrixResponse,
  type TaskPlannerResponse,
  type TaskStatus,
  type TaskSummary,
} from '@focusflow/shared-types'
import { formatDateInTimeZone, localDayBounds } from '@focusflow/shared-utils'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import {
  BOARD_COLUMN_LIMIT,
  completionTimestamp,
  taskInclude,
  toSubtaskView,
  toTaskView,
  type SubtaskRecord,
  type TaskRecord,
} from './task.mapper'

type TaskFilters = {
  status?: TaskStatus
  priority?: ListTasksQuery['priority']
  categoryId?: ListTasksQuery['categoryId']
  q?: string
}

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
      include: taskInclude,
    })
    return toTaskView(created)
  }

  async list(userId: string, query: ListTasksQuery) {
    const where = this.taskWhere(userId, query)
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: taskOrderBy(query.sort, query.order),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: taskInclude,
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

  async board(userId: string, query: BoardTasksQuery): Promise<TaskBoardResponse> {
    const where = this.taskWhere(userId, query)
    const [grouped, ...columns] = await this.prisma.$transaction([
      this.prisma.task.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      ...TASK_STATUSES.map((status) =>
        this.prisma.task.findMany({
          where: { ...where, status },
          orderBy: { updatedAt: 'desc' },
          take: BOARD_COLUMN_LIMIT,
          include: taskInclude,
        }),
      ),
    ])
    const counts: TaskBoardResponse['counts'] = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0, total: 0 }
    for (const row of grouped) {
      counts[row.status] = row._count._all
      counts.total += row._count._all
    }
    return {
      counts,
      columns: TASK_STATUSES.map((status, index) => ({
        status,
        count: counts[status],
        tasks: columns[index].map((task) => toTaskView(task)),
      })),
    }
  }

  async matrix(userId: string, query: BoardTasksQuery): Promise<TaskMatrixResponse> {
    const where = this.taskWhere(userId, query)
    const [grouped, ...columns] = await this.prisma.$transaction([
      this.prisma.task.groupBy({
        by: ['isUrgent', 'isImportant'],
        where,
        _count: { _all: true },
      }),
      ...EISENHOWER_QUADRANTS.map((quadrant) => {
        const flags = flagsForQuadrant(quadrant)
        return this.prisma.task.findMany({
          where: { ...where, isUrgent: flags.isUrgent, isImportant: flags.isImportant },
          orderBy: { updatedAt: 'desc' },
          take: BOARD_COLUMN_LIMIT,
          include: taskInclude,
        })
      }),
    ])
    const counts: TaskMatrixResponse['counts'] = { DO: 0, SCHEDULE: 0, DELEGATE: 0, ELIMINATE: 0, total: 0 }
    for (const row of grouped) {
      const quadrant = deriveEisenhowerQuadrant(row.isUrgent, row.isImportant)
      counts[quadrant] = row._count._all
      counts.total += row._count._all
    }
    return {
      counts,
      quadrants: EISENHOWER_QUADRANTS.map((quadrant, index) => ({
        quadrant,
        count: counts[quadrant],
        tasks: columns[index].map((task) => toTaskView(task)),
      })),
    }
  }

  async planner(userId: string, date: string | undefined, timeZone: string): Promise<TaskPlannerResponse> {
    const day = date ?? formatDateInTimeZone(new Date(), timeZone)
    const bounds = localDayBounds(day, timeZone)
    const scheduledWhere: Prisma.TaskWhereInput = {
      userId,
      scheduledStart: { gte: bounds.start, lt: bounds.end },
    }
    const unscheduledWhere: Prisma.TaskWhereInput = { userId, scheduledStart: null }
    const [timelineCount, timeline, unscheduledCount, unscheduled] = await this.prisma.$transaction([
      this.prisma.task.count({ where: scheduledWhere }),
      this.prisma.task.findMany({
        where: scheduledWhere,
        orderBy: { scheduledStart: 'asc' },
        take: BOARD_COLUMN_LIMIT,
        include: taskInclude,
      }),
      this.prisma.task.count({ where: unscheduledWhere }),
      this.prisma.task.findMany({
        where: unscheduledWhere,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: BOARD_COLUMN_LIMIT,
        include: taskInclude,
      }),
    ])
    return {
      date: day,
      timezone: timeZone,
      timeline: timeline.map((task) => toTaskView(task)),
      unscheduled: unscheduled.map((task) => toTaskView(task)),
      counts: { timeline: timelineCount, unscheduled: unscheduledCount },
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
      throw this.missingTask()
    }
    return toTaskView(await this.requireTask(userId, id))
  }

  async updateStatus(userId: string, id: string, status: TaskStatus) {
    return this.update(userId, id, { status })
  }

  async updateQuadrant(userId: string, id: string, input: UpdateTaskQuadrantInput) {
    await this.requireTask(userId, id)
    const result = await this.prisma.task.updateMany({
      where: { id, userId },
      data: { isUrgent: input.isUrgent, isImportant: input.isImportant },
    })
    if (result.count !== 1) throw this.missingTask()
    return toTaskView(await this.requireTask(userId, id))
  }

  async updateSchedule(userId: string, id: string, input: UpdateTaskScheduleInput, timeZone: string) {
    await this.requireTask(userId, id)
    const data = this.scheduleData(input, timeZone)
    const result = await this.prisma.task.updateMany({ where: { id, userId }, data })
    if (result.count !== 1) throw this.missingTask()
    return toTaskView(await this.requireTask(userId, id))
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireTask(userId, id)
    const result = await this.prisma.task.deleteMany({ where: { id, userId } })
    if (result.count !== 1) {
      throw this.missingTask()
    }
  }

  async attachTag(userId: string, taskId: string, tagId: string) {
    await this.requireTask(userId, taskId)
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, userId },
      select: { id: true },
    })
    if (!tag) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Tag not found.',
      })
    }
    const existing = await this.prisma.taskTag.findFirst({
      where: { taskId, tagId, userId },
      select: { taskId: true },
    })
    if (!existing) {
      await this.prisma.taskTag.create({ data: { taskId, tagId, userId } })
    }
    return this.get(userId, taskId)
  }

  async detachTag(userId: string, taskId: string, tagId: string) {
    await this.requireTask(userId, taskId)
    await this.prisma.taskTag.deleteMany({ where: { taskId, tagId, userId } })
    return this.get(userId, taskId)
  }

  async addSubtask(userId: string, taskId: string, input: CreateSubtaskInput) {
    await this.requireTask(userId, taskId)
    const last = await this.prisma.subtask.aggregate({
      where: { taskId, userId },
      _max: { position: true },
    })
    const created = await this.prisma.subtask.create({
      data: {
        userId,
        taskId,
        title: input.title,
        position: (last._max.position ?? -1) + 1,
      },
    })
    return toSubtaskView(created)
  }

  async updateSubtask(userId: string, taskId: string, subtaskId: string, input: UpdateSubtaskInput) {
    const current = await this.requireSubtask(userId, taskId, subtaskId)
    const data: Prisma.SubtaskUpdateManyMutationInput = {}
    if (input.title !== undefined) data.title = input.title
    if (input.completed !== undefined) data.completed = input.completed
    const result = await this.prisma.subtask.updateMany({
      where: { id: subtaskId, taskId, userId },
      data,
    })
    if (result.count !== 1) {
      throw this.missingSubtask()
    }
    return toSubtaskView({
      ...current,
      title: input.title ?? current.title,
      completed: input.completed ?? current.completed,
    })
  }

  async reorderSubtasks(userId: string, taskId: string, input: ReorderSubtasksInput) {
    await this.requireTask(userId, taskId)
    const rows = await this.prisma.subtask.findMany({
      where: { taskId, userId },
      select: { id: true },
      orderBy: { position: 'asc' },
    })
    if (!sameIdSet(rows.map((row) => row.id), input.ids)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Subtask order must include each subtask on this task once.',
      })
    }
    await this.prisma.$transaction(
      input.ids.map((id, position) =>
        this.prisma.subtask.updateMany({
          where: { id, taskId, userId },
          data: { position },
        }),
      ),
    )
    const ordered = await this.prisma.subtask.findMany({
      where: { taskId, userId },
      orderBy: { position: 'asc' },
    })
    return ordered.map((row) => toSubtaskView(row))
  }

  async removeSubtask(userId: string, taskId: string, subtaskId: string): Promise<void> {
    await this.requireSubtask(userId, taskId, subtaskId)
    const result = await this.prisma.subtask.deleteMany({ where: { id: subtaskId, taskId, userId } })
    if (result.count !== 1) {
      throw this.missingSubtask()
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
        include: taskInclude,
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

  private taskWhere(userId: string, query: TaskFilters): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = { userId }
    if (query.status) where.status = query.status
    if (query.priority) where.priority = query.priority
    if (query.categoryId === 'none') where.categoryId = null
    else if (query.categoryId) where.categoryId = query.categoryId
    const q = query.q?.trim()
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    return where
  }

  private async requireTask(userId: string, id: string): Promise<TaskRecord> {
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: taskInclude,
    })
    if (!task) throw this.missingTask()
    return task
  }

  private async requireSubtask(userId: string, taskId: string, subtaskId: string): Promise<SubtaskRecord> {
    const subtask = await this.prisma.subtask.findFirst({
      where: { id: subtaskId, taskId, userId },
    })
    if (!subtask) throw this.missingSubtask()
    return subtask
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

  private missingTask(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Task not found.',
    })
  }

  private missingSubtask(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Subtask not found.',
    })
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

  private scheduleData(input: UpdateTaskScheduleInput, timeZone: string): {
    scheduledStart: Date | null
    scheduledEnd: Date | null
  } {
    if (input.scheduledStart === null || input.scheduledEnd === null) {
      return { scheduledStart: null, scheduledEnd: null }
    }
    const scheduledStart = new Date(input.scheduledStart)
    const scheduledEnd = new Date(input.scheduledEnd)
    if (!(scheduledEnd.getTime() > scheduledStart.getTime())) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'The end must be after the start.',
      })
    }
    const startDay = formatDateInTimeZone(scheduledStart, timeZone)
    const endDay = formatDateInTimeZone(scheduledEnd, timeZone)
    if (startDay !== endDay) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'A time block must start and end on the same day.',
      })
    }
    return { scheduledStart, scheduledEnd }
  }
}

function sameIdSet(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return false
  if (new Set(next).size !== next.length) return false
  const owned = new Set(current)
  return next.every((id) => owned.has(id))
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
