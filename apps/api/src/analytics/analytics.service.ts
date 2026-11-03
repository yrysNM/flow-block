import { Injectable } from '@nestjs/common'
import type { AnalyticsResponse } from '@focusflow/shared-types'
import { addCivilDays, buildAnalytics, formatDateInTimeZone, isValidTimeZone, localDayBounds } from '@focusflow/shared-utils'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, timeZone: string, weekStartsOn: number, range: '7' | '30'): Promise<AnalyticsResponse> {
    const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC'
    const rangeDays = range === '30' ? 30 : 7
    const now = new Date()
    const endDate = formatDateInTimeZone(now, zone)
    const startDate = addCivilDays(endDate, -(rangeDays - 1))
    const rangeStart = localDayBounds(startDate, zone).start
    const rangeEnd = localDayBounds(endDate, zone).end
    const usageStart = new Date(`${startDate}T00:00:00.000Z`)
    const usageEnd = new Date(`${endDate}T00:00:00.000Z`)

    const [tasks, focusSessions, websiteUsages, habits] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: rangeStart, lt: rangeEnd },
        },
        select: { userId: true, status: true, completedAt: true },
      }),
      this.prisma.focusSession.findMany({
        where: {
          userId,
          startedAt: { lt: rangeEnd },
          OR: [{ endedAt: null }, { endedAt: { gt: rangeStart } }],
        },
        select: {
          userId: true,
          startedAt: true,
          endedAt: true,
          pausedAt: true,
          pausedSeconds: true,
        },
      }),
      this.prisma.websiteUsage.findMany({
        where: { userId, usageDate: { gte: usageStart, lte: usageEnd } },
        select: { userId: true, usageDate: true, usedSeconds: true },
      }),
      this.prisma.habit.findMany({
        where: { userId },
        select: {
          userId: true,
          frequency: true,
          targetCount: true,
          createdAt: true,
          entries: {
            where: { entryDate: { gte: usageStart, lte: usageEnd } },
            select: { entryDate: true, count: true },
          },
        },
      }),
    ])

    return buildAnalytics({
      userId,
      timeZone: zone,
      weekStartsOn,
      rangeDays,
      now,
      tasks,
      focusSessions,
      websiteUsages,
      habits,
    })
  }
}
