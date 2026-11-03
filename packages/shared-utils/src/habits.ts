const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export interface HabitEntryCount {
  date: string
  count: number
}

export function isCivilDate(value: string): boolean {
  const match = DATE_RE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
}

function readCivil(date: string): { year: number; month: number; day: number } {
  const parts = date.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error('Invalid date')
  }
  return { year, month, day }
}

export function addCivilDays(date: string, days: number): string {
  const { year, month, day } = readCivil(date)
  const utc = new Date(Date.UTC(year, month - 1, day + days))
  return utc.toISOString().slice(0, 10)
}

/** 0 is Sunday through 6 is Saturday, using the UTC civil date. */
export function civilWeekday(date: string): number {
  const { year, month, day } = readCivil(date)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function civilWeekStart(date: string, weekStartsOn: number): string {
  const start = ((weekStartsOn % 7) + 7) % 7
  const day = civilWeekday(date)
  return addCivilDays(date, -((day - start + 7) % 7))
}

function countsByDate(entries: readonly HabitEntryCount[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    totals.set(entry.date, (totals.get(entry.date) ?? 0) + entry.count)
  }
  return totals
}

function dailyStreak(entries: readonly HabitEntryCount[], today: string, target: number): number {
  const totals = countsByDate(entries)
  const met = (date: string) => (totals.get(date) ?? 0) >= target
  const start = met(today) ? today : addCivilDays(today, -1)
  if (!met(start)) return 0
  let streak = 0
  let cursor = start
  while (met(cursor)) {
    streak += 1
    cursor = addCivilDays(cursor, -1)
    if (streak > 10000) break
  }
  return streak
}

function weeklyStreak(
  entries: readonly HabitEntryCount[],
  today: string,
  target: number,
  weekStartsOn: number,
): number {
  const sums = new Map<string, number>()
  for (const entry of entries) {
    const start = civilWeekStart(entry.date, weekStartsOn)
    sums.set(start, (sums.get(start) ?? 0) + entry.count)
  }
  const met = (week: string) => (sums.get(week) ?? 0) >= target
  const thisWeek = civilWeekStart(today, weekStartsOn)
  const start = met(thisWeek) ? thisWeek : addCivilDays(thisWeek, -7)
  if (!met(start)) return 0
  let streak = 0
  let cursor = start
  while (met(cursor)) {
    streak += 1
    cursor = addCivilDays(cursor, -7)
    if (streak > 2000) break
  }
  return streak
}

/**
 * Current streak from entry counts against the habit's current target.
 * A day or week that is still open counts the previous run when it is not met yet.
 * A missed daily day ends the streak.
 */
export function currentHabitStreak(input: {
  frequency: 'DAILY' | 'WEEKLY'
  targetCount: number
  entries: readonly HabitEntryCount[]
  today: string
  weekStartsOn?: number
}): number {
  const target = Math.max(1, input.targetCount)
  if (input.frequency === 'WEEKLY') {
    return weeklyStreak(input.entries, input.today, target, input.weekStartsOn ?? 1)
  }
  return dailyStreak(input.entries, input.today, target)
}
