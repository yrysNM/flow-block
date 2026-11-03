import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type {
  CreateGoalInput,
  CreateMilestoneInput,
  LinkGoalTaskInput,
  ReorderMilestonesInput,
  UpdateGoalInput,
  UpdateMilestoneInput,
} from '@focusflow/shared-schemas'
import type { GoalStatus, GoalTaskRef, GoalView, MilestoneView, TaskStatus } from '@focusflow/shared-types'
import { deriveGoalProgress, isCivilDate } from '@focusflow/shared-utils'
import { PrismaService } from '../prisma/prisma.service'

interface MilestoneRecord {
  id: string
  goalId: string
  title: string
  completed: boolean
  position: number
  dueDate: Date | null
}

interface LinkedTaskRecord {
  id: string
  title: string
  status: TaskStatus
}

interface GoalTaskRecord {
  task: LinkedTaskRecord
}

interface GoalRecord {
  id: string
  title: string
  description: string | null
  status: GoalStatus
  targetDate: Date | null
  createdAt: Date
  updatedAt: Date
  milestones: MilestoneRecord[]
  goalTasks: GoalTaskRecord[]
}

const goalInclude = {
  milestones: { orderBy: { position: 'asc' as const } },
  goalTasks: {
    orderBy: { createdAt: 'asc' as const },
    include: { task: { select: { id: true, title: true, status: true } } },
  },
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<GoalView[]> {
    const rows = await this.prisma.goal.findMany({
      where: { userId },
      include: goalInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })
    return rows.map((row) => toGoalView(row))
  }

  async get(userId: string, id: string): Promise<GoalView> {
    return toGoalView(await this.requireGoal(userId, id))
  }

  async create(userId: string, input: CreateGoalInput): Promise<GoalView> {
    const created = await this.prisma.goal.create({
      data: {
        userId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'ACTIVE',
        targetDate: this.deadline(input.deadline),
      },
      include: goalInclude,
    })
    return toGoalView(created)
  }

  async update(userId: string, id: string, input: UpdateGoalInput): Promise<GoalView> {
    await this.requireGoal(userId, id)
    const data = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.deadline !== undefined ? { targetDate: this.deadline(input.deadline) } : {}),
    }
    const result = await this.prisma.goal.updateMany({ where: { id, userId }, data })
    if (result.count !== 1) throw this.missing()
    return this.get(userId, id)
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireGoal(userId, id)
    const result = await this.prisma.goal.deleteMany({ where: { id, userId } })
    if (result.count !== 1) throw this.missing()
  }

  async addMilestone(userId: string, goalId: string, input: CreateMilestoneInput): Promise<GoalView> {
    await this.requireGoal(userId, goalId)
    const max = await this.prisma.milestone.aggregate({
      where: { goalId, userId },
      _max: { position: true },
    })
    await this.prisma.milestone.create({
      data: {
        userId,
        goalId,
        title: input.title,
        position: (max._max.position ?? -1) + 1,
      },
    })
    return this.get(userId, goalId)
  }

  async updateMilestone(userId: string, goalId: string, milestoneId: string, input: UpdateMilestoneInput): Promise<GoalView> {
    await this.requireGoal(userId, goalId)
    const current = await this.prisma.milestone.findFirst({ where: { id: milestoneId, goalId, userId } })
    if (!current) throw this.missingMilestone()
    const data = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.completed !== undefined ? { completed: input.completed } : {}),
    }
    const result = await this.prisma.milestone.updateMany({
      where: { id: milestoneId, goalId, userId },
      data,
    })
    if (result.count !== 1) throw this.missingMilestone()
    return this.get(userId, goalId)
  }

  async reorderMilestones(userId: string, goalId: string, input: ReorderMilestonesInput): Promise<GoalView> {
    const goal = await this.requireGoal(userId, goalId)
    if (!sameIdSet(goal.milestones.map((milestone) => milestone.id), input.ids)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Milestone order must include each milestone on this goal once.',
      })
    }
    await this.prisma.$transaction(
      input.ids.map((id, position) =>
        this.prisma.milestone.updateMany({
          where: { id, goalId, userId },
          data: { position },
        }),
      ),
    )
    return this.get(userId, goalId)
  }

  async removeMilestone(userId: string, goalId: string, milestoneId: string): Promise<void> {
    await this.requireGoal(userId, goalId)
    const result = await this.prisma.milestone.deleteMany({ where: { id: milestoneId, goalId, userId } })
    if (result.count !== 1) throw this.missingMilestone()
  }

  async linkTask(userId: string, goalId: string, input: LinkGoalTaskInput): Promise<GoalView> {
    await this.requireGoal(userId, goalId)
    const task = await this.prisma.task.findFirst({
      where: { id: input.taskId, userId },
      select: { id: true },
    })
    if (!task) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Task not found.',
      })
    }
    const existing = await this.prisma.goalTask.findFirst({
      where: { goalId, taskId: input.taskId, userId },
      select: { goalId: true },
    })
    if (!existing) {
      try {
        await this.prisma.goalTask.create({
          data: { goalId, taskId: input.taskId, userId },
        })
      } catch (error) {
        if (!isUnique(error)) throw error
      }
    }
    return this.get(userId, goalId)
  }

  async unlinkTask(userId: string, goalId: string, taskId: string): Promise<GoalView> {
    await this.requireGoal(userId, goalId)
    const result = await this.prisma.goalTask.deleteMany({ where: { goalId, taskId, userId } })
    if (result.count !== 1) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: 'Linked task not found.',
      })
    }
    return this.get(userId, goalId)
  }

  private async requireGoal(userId: string, id: string): Promise<GoalRecord> {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId },
      include: goalInclude,
    })
    if (!goal) throw this.missing()
    return goal
  }

  private deadline(value: string | null | undefined): Date | null {
    if (value === undefined || value === null) return null
    if (!isCivilDate(value)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Deadline must be YYYY-MM-DD.',
      })
    }
    return new Date(`${value}T00:00:00.000Z`)
  }

  private missing(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Goal not found.',
    })
  }

  private missingMilestone(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Milestone not found.',
    })
  }
}

function toMilestoneView(row: MilestoneRecord): MilestoneView {
  return {
    id: row.id,
    goalId: row.goalId,
    title: row.title,
    completed: row.completed,
    position: row.position,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
  }
}

function toTaskRef(row: LinkedTaskRecord): GoalTaskRef {
  return { id: row.id, title: row.title, status: row.status }
}

function toGoalView(goal: GoalRecord): GoalView {
  const milestones = [...goal.milestones].sort((left, right) => left.position - right.position)
  const tasks = goal.goalTasks.map((link) => link.task)
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    deadline: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
    milestones: milestones.map((row) => toMilestoneView(row)),
    tasks: tasks.map((task) => toTaskRef(task)),
    progress: deriveGoalProgress({ milestones, linkedTasks: tasks }),
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  }
}

function sameIdSet(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return false
  if (new Set(next).size !== next.length) return false
  const owned = new Set(current)
  return next.every((id) => owned.has(id))
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}
