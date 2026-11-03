import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateWebsiteRuleInput, RecordWebsiteUsageInput, UpdateWebsiteRuleInput } from '@focusflow/shared-schemas'
import type { WebsiteRuleView, WebsiteUsageEventResult, WebsiteUsageResponse } from '@focusflow/shared-types'
import { formatDateInTimeZone, hostMatchesDomain, normalizeDomain } from '@focusflow/shared-utils'
import type { Prisma, WebsiteRule } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002'
}

function toView(row: WebsiteRule): WebsiteRuleView {
  return {
    id: row.id,
    domain: row.domain,
    mode: row.mode === 'ALLOW' ? 'ALLOW' : 'BLOCK',
    enabled: row.enabled,
    dailyLimitMinutes: row.dailyLimitMinutes,
    scheduleStartMinute: row.scheduleStartMinute,
    scheduleEndMinute: row.scheduleEndMinute,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class WebsitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<WebsiteRuleView[]> {
    const rows = await this.prisma.websiteRule.findMany({
      where: { userId },
      orderBy: { domain: 'asc' },
    })
    return rows.map((row) => toView(row))
  }

  async create(userId: string, input: CreateWebsiteRuleInput): Promise<WebsiteRuleView> {
    const domain = this.requireDomain(input.domain)
    const schedule = this.schedulePair(input.scheduleStartMinute, input.scheduleEndMinute)
    try {
      const created = await this.prisma.websiteRule.create({
        data: {
          userId,
          domain,
          mode: input.mode ?? 'BLOCK',
          enabled: input.enabled ?? true,
          dailyLimitMinutes: input.dailyLimitMinutes ?? null,
          scheduleStartMinute: schedule.start,
          scheduleEndMinute: schedule.end,
        },
      })
      return toView(created)
    } catch (error) {
      if (isUniqueConflict(error)) throw this.duplicateDomain()
      throw error
    }
  }

  async update(userId: string, id: string, input: UpdateWebsiteRuleInput): Promise<WebsiteRuleView> {
    const current = await this.requireRule(userId, id)
    const data: Prisma.WebsiteRuleUpdateManyMutationInput = {}
    if (input.domain !== undefined) data.domain = this.requireDomain(input.domain)
    if (input.mode !== undefined) data.mode = input.mode
    if (input.enabled !== undefined) data.enabled = input.enabled
    if (input.dailyLimitMinutes !== undefined) data.dailyLimitMinutes = input.dailyLimitMinutes
    if (input.scheduleStartMinute !== undefined || input.scheduleEndMinute !== undefined) {
      const schedule = this.schedulePair(
        input.scheduleStartMinute === undefined ? current.scheduleStartMinute : input.scheduleStartMinute,
        input.scheduleEndMinute === undefined ? current.scheduleEndMinute : input.scheduleEndMinute,
      )
      data.scheduleStartMinute = schedule.start
      data.scheduleEndMinute = schedule.end
    }
    try {
      const result = await this.prisma.websiteRule.updateMany({ where: { id, userId }, data })
      if (result.count !== 1) throw this.missing()
    } catch (error) {
      if (isUniqueConflict(error)) throw this.duplicateDomain()
      throw error
    }
    return toView(await this.requireRule(userId, id))
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireRule(userId, id)
    const result = await this.prisma.websiteRule.deleteMany({ where: { id, userId } })
    if (result.count !== 1) throw this.missing()
  }

  async usage(userId: string, timeZone: string, date: string | undefined): Promise<WebsiteUsageResponse> {
    const zone = this.zone(timeZone)
    const usageDate = date ?? formatDateInTimeZone(new Date(), zone)
    const day = new Date(`${usageDate}T00:00:00.000Z`)
    const [rules, rows] = await Promise.all([
      this.prisma.websiteRule.findMany({ where: { userId }, orderBy: { domain: 'asc' } }),
      this.prisma.websiteUsage.findMany({ where: { userId, usageDate: day } }),
    ])
    const used = new Map(rows.map((row) => [row.websiteRuleId, row.usedSeconds]))
    return {
      date: usageDate,
      timezone: zone,
      totals: rules.map((rule) => ({
        ruleId: rule.id,
        domain: rule.domain,
        mode: rule.mode === 'ALLOW' ? 'ALLOW' : 'BLOCK',
        usedSeconds: used.get(rule.id) ?? 0,
        dailyLimitMinutes: rule.dailyLimitMinutes,
      })),
    }
  }

  async recordEvent(userId: string, timeZone: string, input: RecordWebsiteUsageInput): Promise<WebsiteUsageEventResult> {
    const domain = this.requireDomain(input.domain)
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
    const existing = await this.prisma.websiteUsageEvent.findFirst({
      where: { userId, clientEventId: input.clientEventId },
    })
    if (existing) {
      return {
        stored: false,
        clientEventId: existing.clientEventId,
        ruleId: existing.websiteRuleId,
        domain: existing.domain,
        usedSeconds: await this.usedSeconds(userId, existing.websiteRuleId, existing.occurredAt, timeZone),
      }
    }

    const rules = await this.prisma.websiteRule.findMany({ where: { userId } })
    const rule = this.bestRule(rules, domain)
    try {
      await this.prisma.websiteUsageEvent.create({
        data: {
          userId,
          clientEventId: input.clientEventId,
          websiteRuleId: rule?.id ?? null,
          domain,
          seconds: input.seconds,
          occurredAt,
        },
      })
    } catch (error) {
      if (!isUniqueConflict(error)) throw error
      return {
        stored: false,
        clientEventId: input.clientEventId,
        ruleId: rule?.id ?? null,
        domain,
        usedSeconds: await this.usedSeconds(userId, rule?.id ?? null, occurredAt, timeZone),
      }
    }

    let usedSeconds = 0
    if (rule) {
      const usageDate = this.usageDate(occurredAt, timeZone)
      const row = await this.prisma.websiteUsage.upsert({
        where: { websiteRuleId_usageDate: { websiteRuleId: rule.id, usageDate } },
        create: {
          userId,
          websiteRuleId: rule.id,
          usageDate,
          usedSeconds: input.seconds,
        },
        update: { usedSeconds: { increment: input.seconds } },
      })
      usedSeconds = row.usedSeconds
    }
    return {
      stored: true,
      clientEventId: input.clientEventId,
      ruleId: rule?.id ?? null,
      domain,
      usedSeconds,
    }
  }

  private bestRule(rules: WebsiteRule[], domain: string): WebsiteRule | null {
    const matches = rules.filter((rule) => hostMatchesDomain(domain, rule.domain))
    matches.sort((left, right) => right.domain.length - left.domain.length)
    return matches[0] ?? null
  }

  private async usedSeconds(userId: string, ruleId: string | null, occurredAt: Date, timeZone: string): Promise<number> {
    if (!ruleId) return 0
    const row = await this.prisma.websiteUsage.findFirst({
      where: { userId, websiteRuleId: ruleId, usageDate: this.usageDate(occurredAt, timeZone) },
    })
    return row?.usedSeconds ?? 0
  }

  private usageDate(instant: Date, timeZone: string): Date {
    return new Date(`${formatDateInTimeZone(instant, this.zone(timeZone))}T00:00:00.000Z`)
  }

  private zone(timeZone: string): string {
    try {
      formatDateInTimeZone(new Date(), timeZone)
      return timeZone
    } catch {
      return 'UTC'
    }
  }

  private requireDomain(input: string): string {
    const domain = normalizeDomain(input)
    if (!domain) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Enter a domain like example.com.',
      })
    }
    return domain
  }

  private schedulePair(
    start: number | null | undefined,
    end: number | null | undefined,
  ): { start: number | null; end: number | null } {
    const scheduleStart = start ?? null
    const scheduleEnd = end ?? null
    if ((scheduleStart === null) !== (scheduleEnd === null)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Set both schedule start and end, or clear both.',
      })
    }
    return { start: scheduleStart, end: scheduleEnd }
  }

  private async requireRule(userId: string, id: string): Promise<WebsiteRule> {
    const row = await this.prisma.websiteRule.findFirst({ where: { id, userId } })
    if (!row) throw this.missing()
    return row
  }

  private missing(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Website rule not found.',
    })
  }

  private duplicateDomain(): ConflictException {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: 'A rule for that domain already exists.',
    })
  }
}
