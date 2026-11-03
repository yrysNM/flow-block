import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { CreateHabitInput, HabitCheckInInput, UpdateHabitInput } from '@focusflow/shared-schemas'
import type { HabitCheckInResult, HabitDetailView, HabitEntryView, HabitFrequency, HabitView } from '@focusflow/shared-types'
import { currentHabitStreak, formatDateInTimeZone, isCivilDate, isValidTimeZone } from '@focusflow/shared-utils'
import { PrismaService } from '../prisma/prisma.service'

interface EntryRecord {
  id: string
  habitId: string
  entryDate: Date
  count: number
}

interface HabitRecord {
  id: string
  name: string
  frequency: HabitFrequency
  targetCount: number
  createdAt: Date
  updatedAt: Date
  entries: EntryRecord[]
}

const habitInclude = {
  entries: { orderBy: { entryDate: 'asc' as const } },
}

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, timeZone: string, weekStartsOn: number): Promise<HabitView[]> {
    const rows = await this.prisma.habit.findMany({
      where: { userId },
      include: habitInclude,
      orderBy: { name: 'asc' },
    })
    const today = this.today(timeZone)
    return rows.map((row) => toHabitView(row, today, weekStartsOn))
  }

  async get(userId: string, id: string, month: string | undefined, timeZone: string, weekStartsOn: number): Promise<HabitDetailView> {
    const habit = await this.requireHabit(userId, id)
    const today = this.today(timeZone)
    const monthKey = this.monthKey(month, today)
    return {
      ...toHabitView(habit, today, weekStartsOn),
      month: monthKey,
      entries: habit.entries.filter((entry) => civilDate(entry.entryDate).startsWith(monthKey)).map((entry) => toEntryView(entry, habit.targetCount)),
    }
  }

  async create(userId: string, input: CreateHabitInput, timeZone: string, weekStartsOn: number): Promise<HabitView> {
    const created = await this.prisma.habit.create({
      data: {
        userId,
        name: input.name,
        frequency: input.frequency ?? 'DAILY',
        targetCount: input.targetCount ?? 1,
      },
      include: habitInclude,
    })
    return toHabitView(created, this.today(timeZone), weekStartsOn)
  }

  async update(userId: string, id: string, input: UpdateHabitInput, timeZone: string, weekStartsOn: number): Promise<HabitView> {
    await this.requireHabit(userId, id)
    const result = await this.prisma.habit.updateMany({
      where: { id, userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.targetCount !== undefined ? { targetCount: input.targetCount } : {}),
      },
    })
    if (result.count !== 1) throw this.missing()
    return toHabitView(await this.requireHabit(userId, id), this.today(timeZone), weekStartsOn)
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.requireHabit(userId, id)
    const result = await this.prisma.habit.deleteMany({ where: { id, userId } })
    if (result.count !== 1) throw this.missing()
  }

  async checkIn(
    userId: string,
    habitId: string,
    input: HabitCheckInInput,
    timeZone: string,
    weekStartsOn: number,
  ): Promise<HabitCheckInResult> {
    const habit = await this.requireHabit(userId, habitId)
    const date = input.date ?? this.today(timeZone)
    if (!isCivilDate(date)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Check-in date must be YYYY-MM-DD.',
      })
    }
    const entryDate = new Date(`${date}T00:00:00.000Z`)
    const existing = await this.prisma.habitEntry.findFirst({
      where: { habitId, userId, entryDate },
    })
    const row = existing
      ? await this.writeCount(userId, habitId, existing, input.count, habit.targetCount)
      : await this.insertOrUpdate(userId, habitId, entryDate, input.count, habit.targetCount)
    const refreshed = await this.requireHabit(userId, habitId)
    return {
      entry: toEntryView(row, refreshed.targetCount),
      habit: toHabitView(refreshed, this.today(timeZone), weekStartsOn),
    }
  }

  private async writeCount(
    userId: string,
    habitId: string,
    existing: EntryRecord,
    requested: number | undefined,
    targetCount: number,
  ): Promise<EntryRecord> {
    const count = requested === undefined ? existing.count + 1 : requested
    const completed = count >= targetCount
    const result = await this.prisma.habitEntry.updateMany({
      where: { id: existing.id, habitId, userId },
      data: { count, completed },
    })
    if (result.count !== 1) throw this.missing()
    return { ...existing, count }
  }

  private async insertOrUpdate(
    userId: string,
    habitId: string,
    entryDate: Date,
    requested: number | undefined,
    targetCount: number,
  ): Promise<EntryRecord> {
    const count = requested === undefined ? 1 : requested
    try {
      const created = await this.prisma.habitEntry.create({
        data: {
          userId,
          habitId,
          entryDate,
          count,
          completed: count >= targetCount,
        },
      })
      return created
    } catch (error) {
      if (!isUnique(error)) throw error
      const raced = await this.prisma.habitEntry.findFirst({ where: { habitId, userId, entryDate } })
      if (!raced) throw error
      return this.writeCount(userId, habitId, raced, requested, targetCount)
    }
  }

  private async requireHabit(userId: string, id: string): Promise<HabitRecord> {
    const habit = await this.prisma.habit.findFirst({
      where: { id, userId },
      include: habitInclude,
    })
    if (!habit) throw this.missing()
    return habit
  }

  private today(timeZone: string): string {
    const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC'
    return formatDateInTimeZone(new Date(), zone)
  }

  private monthKey(month: string | undefined, today: string): string {
    const value = month ?? today.slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(value) || !isCivilDate(`${value}-01`)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Month must be YYYY-MM.',
      })
    }
    return value
  }

  private missing(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Habit not found.',
    })
  }
}

function civilDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function toEntryView(entry: EntryRecord, targetCount: number): HabitEntryView {
  return {
    id: entry.id,
    habitId: entry.habitId,
    date: civilDate(entry.entryDate),
    count: entry.count,
    met: entry.count >= targetCount,
  }
}

function toHabitView(habit: HabitRecord, today: string, weekStartsOn: number): HabitView {
  const entries = habit.entries.map((entry) => ({ date: civilDate(entry.entryDate), count: entry.count }))
  const todayCount = entries.find((entry) => entry.date === today)?.count ?? 0
  return {
    id: habit.id,
    name: habit.name,
    frequency: habit.frequency,
    targetCount: habit.targetCount,
    streak: currentHabitStreak({
      frequency: habit.frequency,
      targetCount: habit.targetCount,
      entries,
      today,
      weekStartsOn,
    }),
    todayCount,
    todayMet: todayCount >= habit.targetCount,
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  }
}

function isUnique(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}
