import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { FocusSessionListResponse, FocusSessionView } from '@focusflow/shared-types'
import { deriveFocusSessionStatus } from '@focusflow/shared-types'
import type { ListFocusSessionsQuery, StartFocusSessionInput } from '@focusflow/shared-schemas'
import { focusElapsedSeconds, focusRemainingSeconds } from '@focusflow/shared-utils'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

const sessionInclude = {
  task: { select: { id: true, title: true, status: true } },
} satisfies Prisma.FocusSessionInclude

type SessionRow = Prisma.FocusSessionGetPayload<{ include: typeof sessionInclude }>

export interface FocusStartResult {
  session: FocusSessionView
  created: boolean
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002'
}

function toView(row: SessionRow, now: Date): FocusSessionView {
  const startedAt = row.startedAt ?? row.createdAt
  const elapsedSeconds = focusElapsedSeconds({
    startedAt,
    endedAt: row.endedAt,
    pausedAt: row.pausedAt,
    pausedSeconds: row.pausedSeconds,
    now,
  })
  return {
    id: row.id,
    taskId: row.taskId,
    task: row.task
      ? { id: row.task.id, title: row.task.title, status: row.task.status }
      : null,
    plannedSeconds: row.plannedSeconds,
    status: deriveFocusSessionStatus({
      endedAt: row.endedAt,
      pausedAt: row.pausedAt,
      completed: row.completed,
    }),
    startedAt: startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    pausedAt: row.pausedAt ? row.pausedAt.toISOString() : null,
    pausedSeconds: row.pausedSeconds,
    elapsedSeconds,
    remainingSeconds: focusRemainingSeconds(row.plannedSeconds, elapsedSeconds),
    completed: row.completed,
    serverNow: now.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class FocusService {
  constructor(private readonly prisma: PrismaService) {}

  async active(userId: string): Promise<FocusSessionView | null> {
    const row = await this.prisma.focusSession.findFirst({
      where: { userId, endedAt: null },
      include: sessionInclude,
    })
    return row ? toView(row, new Date()) : null
  }

  async history(userId: string, query: ListFocusSessionsQuery): Promise<FocusSessionListResponse> {
    const where = { userId, endedAt: { not: null } }
    const [total, rows] = await Promise.all([
      this.prisma.focusSession.count({ where }),
      this.prisma.focusSession.findMany({
        where,
        include: sessionInclude,
        orderBy: { endedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
    const now = new Date()
    return {
      data: rows.map((row) => toView(row, now)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    }
  }

  async start(userId: string, input: StartFocusSessionInput): Promise<FocusStartResult> {
    const existing = await this.findActive(userId)
    if (existing) return { session: toView(existing, new Date()), created: false }

    if (input.taskId) {
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
    }

    try {
      const created = await this.prisma.focusSession.create({
        data: {
          userId,
          taskId: input.taskId ?? null,
          plannedSeconds: input.plannedSeconds,
          startedAt: new Date(),
        },
        include: sessionInclude,
      })
      return { session: toView(created, new Date()), created: true }
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
      const active = await this.findActive(userId)
      if (!active) throw error
      return { session: toView(active, new Date()), created: false }
    }
  }

  async pause(userId: string, id: string): Promise<FocusSessionView> {
    const row = await this.requireActive(userId, id)
    if (row.pausedAt) return toView(row, new Date())
    const now = new Date()
    const written = await this.prisma.focusSession.updateMany({
      where: { id, userId, endedAt: null, pausedAt: null },
      data: { pausedAt: now },
    })
    if (written.count === 0) return this.readAfterRace(userId, id)
    return toView(await this.requireOwned(userId, id), now)
  }

  async resume(userId: string, id: string): Promise<FocusSessionView> {
    const row = await this.requireActive(userId, id)
    if (!row.pausedAt) return toView(row, new Date())
    const now = new Date()
    const added = Math.max(0, Math.floor((now.getTime() - row.pausedAt.getTime()) / 1000))
    const written = await this.prisma.focusSession.updateMany({
      where: { id, userId, endedAt: null, pausedAt: { not: null } },
      data: { pausedAt: null, pausedSeconds: { increment: added } },
    })
    if (written.count === 0) return this.readAfterRace(userId, id)
    return toView(await this.requireOwned(userId, id), now)
  }

  async complete(userId: string, id: string): Promise<FocusSessionView> {
    return this.end(userId, id, true)
  }

  async stop(userId: string, id: string): Promise<FocusSessionView> {
    return this.end(userId, id, false)
  }

  private async end(userId: string, id: string, completed: boolean): Promise<FocusSessionView> {
    const row = await this.requireActive(userId, id)
    const now = new Date()
    const openPause = row.pausedAt && row.pausedAt.getTime() < now.getTime()
      ? Math.floor((now.getTime() - row.pausedAt.getTime()) / 1000)
      : 0
    await this.prisma.$transaction(async (tx) => {
      const written = await tx.focusSession.updateMany({
        where: { id, userId, endedAt: null },
        data: {
          endedAt: now,
          completed,
          pausedAt: null,
          pausedSeconds: row.pausedSeconds + openPause,
        },
      })
      if (written.count === 0) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: 'That focus session has already ended.',
        })
      }
      if (completed) {
        await tx.notification.create({
          data: {
            userId,
            type: 'FOCUS',
            title: 'Focus session completed',
            linkPath: '/focus',
          },
        })
      }
    })
    return toView(await this.requireOwned(userId, id), now)
  }

  private findActive(userId: string): Promise<SessionRow | null> {
    return this.prisma.focusSession.findFirst({
      where: { userId, endedAt: null },
      include: sessionInclude,
    })
  }

  private async requireOwned(userId: string, id: string): Promise<SessionRow> {
    const row = await this.prisma.focusSession.findFirst({
      where: { id, userId },
      include: sessionInclude,
    })
    if (!row) throw this.missing()
    return row
  }

  private async requireActive(userId: string, id: string): Promise<SessionRow> {
    const row = await this.requireOwned(userId, id)
    if (row.endedAt) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'That focus session has already ended.',
      })
    }
    return row
  }

  private async readAfterRace(userId: string, id: string): Promise<FocusSessionView> {
    const row = await this.requireOwned(userId, id)
    if (row.endedAt) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'That focus session has already ended.',
      })
    }
    return toView(row, new Date())
  }

  private missing(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Focus session not found.',
    })
  }
}
