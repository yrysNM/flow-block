import { Injectable, NotFoundException } from '@nestjs/common'
import type { NotificationListResponse, NotificationType, NotificationView } from '@focusflow/shared-types'
import { PrismaService } from '../prisma/prisma.service'

const LIST_LIMIT = 100

interface NotificationRow {
  id: string
  type: NotificationType
  title: string
  linkPath: string | null
  readAt: Date | null
  createdAt: Date
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<NotificationListResponse> {
    const [rows, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: LIST_LIMIT,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ])
    return {
      unreadCount,
      data: rows.map((row) => toView(row)),
    }
  }

  async markRead(userId: string, id: string): Promise<NotificationView> {
    const existing = await this.prisma.notification.findFirst({ where: { id, userId } })
    if (!existing) throw this.missing()
    if (existing.readAt) return toView(existing)
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    })
    const updated = await this.prisma.notification.findFirst({ where: { id, userId } })
    if (!updated) throw this.missing()
    return toView(updated)
  }

  async markAllRead(userId: string): Promise<NotificationListResponse> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
    return this.list(userId)
  }

  private missing(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Notification not found.',
    })
  }
}

function toView(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    linkPath: row.linkPath && row.linkPath.startsWith('/') ? row.linkPath : '/tasks',
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}
