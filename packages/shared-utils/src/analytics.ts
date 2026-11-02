import { addCivilDays, civilWeekStart } from './habits'

type FormatDate = (instant: Date, timeZone: string) => string
type DayBounds = (date: string, timeZone: string) => { start: Date; end: Date }

let formatDateInTimeZone: FormatDate | null = null
let localDayBounds: DayBounds | null = null

/** Called from the package entry once the time-zone helpers exist. */
export function bindAnalyticsTime(formatDate: FormatDate, bounds: DayBounds): void {
  formatDateInTimeZone = formatDate
  localDayBounds = bounds
}

function formatDate(instant: Date, timeZone: string): string {
  if (!formatDateInTimeZone || !localDayBounds) {
    throw new Error('Analytics time helpers are not bound')
  }
  return formatDateInTimeZone(instant, timeZone)
}

function dayBounds(date: string, timeZone: string): { start: Date; end: Date } {
  if (!localDayBounds) throw new Error('Analytics time helpers are not bound')
  return localDayBounds(date, timeZone)
}

export interface AnalyticsDayPoint {
  date: string
  tasksCompleted: number
  focusSeconds: number
  websiteUsedSeconds: number
  habitCheckIns: number
  habitExpected: number
}

export interface AnalyticsSnapshot {
  range: 7 | 30
  timezone: string
  startDate: string
  endDate: string
  tasksCompleted: number
  focusSeconds: number
  websiteUsedSeconds: number
  habitConsistency: { checkIns: number; expected: number }
  series: AnalyticsDayPoint[]
}

export interface AnalyticsTaskRow {
  userId: string
  status: string
  completedAt: Date | null
}

export interface AnalyticsFocusRow {
  userId: string
  startedAt: Date | null
  endedAt: Date | null
  pausedAt: Date | null
  pausedSeconds: number
}

export interface AnalyticsUsageRow {
  userId: string
  usageDate: Date
  usedSeconds: number
}

export interface AnalyticsHabitRow {
  userId: string
  frequency: 'DAILY' | 'WEEKLY'
  targetCount: number
  createdAt: Date
  entries: ReadonlyArray<{ entryDate: Date; count: number }>
}

function civilDates(start: string, end: string): string[] {
  const dates: string[] = []
  let cursor = start
  while (cursor <= end && dates.length <= 31) {
    dates.push(cursor)
    cursor = addCivilDays(cursor, 1)
  }
  return dates
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

/**
 * Working seconds of one session inside [windowStart, windowEnd).
 * Closed pauses are spread across the session wall. The open pause is the exact overlap.
 * The result is never larger than the wall time inside the window.
 */
export function focusSecondsInWindow(
  input: {
    startedAt: Date
    endedAt: Date | null
    pausedAt: Date | null
    pausedSeconds: number
    now: Date
  },
  windowStart: Date,
  windowEnd: Date,
): number {
  const sessionEnd = input.endedAt ?? input.now
  const sessionStartMs = input.startedAt.getTime()
  const sessionEndMs = sessionEnd.getTime()
  const sessionWallMs = sessionEndMs - sessionStartMs
  if (sessionWallMs <= 0) return 0
  const clipStart = Math.max(sessionStartMs, windowStart.getTime())
  const clipEnd = Math.min(sessionEndMs, windowEnd.getTime())
  const wallMs = clipEnd - clipStart
  if (wallMs <= 0) return 0

  const closedPauseMs = Math.max(0, input.pausedSeconds) * 1000
  const closedInWindow = Math.min(wallMs, (closedPauseMs * wallMs) / sessionWallMs)
  let openPauseMs = 0
  if (input.pausedAt && input.pausedAt.getTime() < sessionEndMs) {
    const pauseStart = Math.max(input.pausedAt.getTime(), clipStart)
    if (pauseStart < clipEnd) openPauseMs = clipEnd - pauseStart
  }
  const pausedMs = Math.min(wallMs, closedInWindow + openPauseMs)
  return Math.max(0, Math.floor((wallMs - pausedMs) / 1000))
}

function emptyPoint(date: string): AnalyticsDayPoint {
  return {
    date,
    tasksCompleted: 0,
    focusSeconds: 0,
    websiteUsedSeconds: 0,
    habitCheckIns: 0,
    habitExpected: 0,
  }
}

/**
 * Every number is derived from the supplied rows for `userId`.
 * Days in the range are always present. A day with no rows is zero.
 */
export function buildAnalytics(input: {
  userId: string
  timeZone: string
  weekStartsOn: number
  rangeDays: 7 | 30
  now: Date
  tasks: readonly AnalyticsTaskRow[]
  focusSessions: readonly AnalyticsFocusRow[]
  websiteUsages: readonly AnalyticsUsageRow[]
  habits: readonly AnalyticsHabitRow[]
}): AnalyticsSnapshot {
  const zone = input.timeZone
  const today = formatDate(input.now, zone)
  const startDate = addCivilDays(today, -(input.rangeDays - 1))
  const dates = civilDates(startDate, today)
  const points = new Map(dates.map((date) => [date, emptyPoint(date)]))
  const weekStartsOn = ((input.weekStartsOn % 7) + 7) % 7
  let habitCheckIns = 0
  let habitExpected = 0

  for (const task of input.tasks) {
    if (task.userId !== input.userId || task.status !== 'COMPLETED' || !task.completedAt) continue
    const date = formatDate(task.completedAt, zone)
    const point = points.get(date)
    if (!point) continue
    point.tasksCompleted += 1
  }

  for (const session of input.focusSessions) {
    if (session.userId !== input.userId || !session.startedAt) continue
    const timing = {
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      pausedAt: session.pausedAt,
      pausedSeconds: session.pausedSeconds,
      now: input.now,
    }
    for (const date of dates) {
      const bounds = dayBounds(date, zone)
      const seconds = focusSecondsInWindow(timing, bounds.start, bounds.end)
      const point = points.get(date)
      if (point && seconds > 0) point.focusSeconds += seconds
    }
  }

  for (const usage of input.websiteUsages) {
    if (usage.userId !== input.userId) continue
    const point = points.get(dateKey(usage.usageDate))
    if (!point) continue
    point.websiteUsedSeconds += Math.max(0, usage.usedSeconds)
  }

  for (const habit of input.habits) {
    if (habit.userId !== input.userId) continue
    const target = Math.max(1, habit.targetCount)
    const createdDate = formatDate(habit.createdAt, zone)
    const counts = new Map<string, number>()
    for (const entry of habit.entries) {
      const date = dateKey(entry.entryDate)
      counts.set(date, (counts.get(date) ?? 0) + entry.count)
    }
    if (habit.frequency === 'WEEKLY') {
      const weeks = new Map<string, string[]>()
      for (const date of dates) {
        if (date < createdDate) continue
        const week = civilWeekStart(date, weekStartsOn)
        const days = weeks.get(week) ?? []
        days.push(date)
        weeks.set(week, days)
      }
      for (const days of weeks.values()) {
        habitExpected += 1
        const sum = days.reduce((total, date) => total + (counts.get(date) ?? 0), 0)
        if (sum >= target) habitCheckIns += 1
      }
      continue
    }
    for (const date of dates) {
      if (date < createdDate) continue
      habitExpected += 1
      const point = points.get(date)
      if (point) point.habitExpected += 1
      if ((counts.get(date) ?? 0) >= target) {
        habitCheckIns += 1
        if (point) point.habitCheckIns += 1
      }
    }
  }

  const series = dates.map((date) => points.get(date) ?? emptyPoint(date))
  const tasksCompleted = series.reduce((total, point) => total + point.tasksCompleted, 0)
  const focusSeconds = series.reduce((total, point) => total + point.focusSeconds, 0)
  const websiteUsedSeconds = series.reduce((total, point) => total + point.websiteUsedSeconds, 0)

  return {
    range: input.rangeDays,
    timezone: zone,
    startDate,
    endDate: today,
    tasksCompleted,
    focusSeconds,
    websiteUsedSeconds,
    habitConsistency: { checkIns: habitCheckIns, expected: habitExpected },
    series,
  }
}

export function analyticsHasActivity(series: readonly AnalyticsDayPoint[]): boolean {
  return series.some((point) =>
    point.tasksCompleted > 0 || point.focusSeconds > 0 || point.websiteUsedSeconds > 0 || point.habitCheckIns > 0,
  )
}
