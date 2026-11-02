import { bindAnalyticsTime } from './analytics'

export {
  accountPreferences,
  DEFAULT_FOCUS_SECONDS,
  initialFocusSelection,
  type AccountPreferenceInput,
  type AccountPreferences,
  type FocusDurationSelection,
} from './account'

export {
  hostMatchesDomain,
  isWithinSchedule,
  normalizeDomain,
  shouldBlockWebsite,
  type BlockingDecision,
  type BlockingMode,
  type BlockingReason,
  type BlockingRule,
} from './blocking'
export {
  addCivilDays,
  civilWeekday,
  civilWeekStart,
  currentHabitStreak,
  isCivilDate,
  type HabitEntryCount,
} from './habits'
export { deriveGoalProgress, type GoalProgress } from './goals'
export {
  analyticsHasActivity,
  buildAnalytics,
  focusSecondsInWindow,
  type AnalyticsDayPoint,
  type AnalyticsFocusRow,
  type AnalyticsHabitRow,
  type AnalyticsSnapshot,
  type AnalyticsTaskRow,
  type AnalyticsUsageRow,
} from './analytics'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(0)
    return true
  } catch {
    return false
  }
}

function readZonedParts(instant: Date, timeZone: string): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = formatter.formatToParts(instant)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  }
}

function offsetMs(instant: Date, timeZone: string): number {
  const parts = readZonedParts(instant, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - instant.getTime()
}

/** Convert a wall-clock time in `timeZone` to a UTC instant. */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  const first = new Date(guess.getTime() - offsetMs(guess, timeZone))
  return new Date(guess.getTime() - offsetMs(first, timeZone))
}

export function localDayBounds(date: string, timeZone: string): { start: Date; end: Date } {
  const match = DATE_RE.exec(date)
  if (!match || !isValidTimeZone(timeZone)) {
    throw new Error('Invalid date or time zone')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const start = zonedLocalToUtc(year, month, day, 0, 0, 0, timeZone)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  const end = zonedLocalToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0, timeZone)
  return { start, end }
}

export interface FocusTiming {
  startedAt: Date
  endedAt: Date | null
  pausedAt: Date | null
  pausedSeconds: number
  now: Date
}

/**
 * Working time in whole seconds.
 * Closed pauses are `pausedSeconds`. An open pause runs from `pausedAt` until `endedAt` or `now`.
 */
export function focusElapsedSeconds(input: FocusTiming): number {
  const end = input.endedAt ?? input.now
  let pausedMs = Math.max(0, input.pausedSeconds) * 1000
  if (input.pausedAt && input.pausedAt.getTime() < end.getTime()) {
    pausedMs += end.getTime() - input.pausedAt.getTime()
  }
  return Math.max(0, Math.floor((end.getTime() - input.startedAt.getTime() - pausedMs) / 1000))
}

export function focusRemainingSeconds(plannedSeconds: number, elapsedSeconds: number): number {
  return Math.max(0, plannedSeconds - elapsedSeconds)
}

/** Minute of the civil day in `timeZone`, from 0 through 1439. */
export function minuteInTimeZone(instant: Date, timeZone: string): number {
  if (!isValidTimeZone(timeZone)) throw new Error('Invalid time zone')
  const parts = readZonedParts(instant, timeZone)
  return parts.hour * 60 + parts.minute
}

/**
 * Move an instant by whole local days in `timeZone`, keeping the local clock time.
 * Daylight-saving transitions change the UTC offset, not the wall time.
 */
export function addZonedInterval(instant: Date, days: number, timeZone: string): Date {
  if (!isValidTimeZone(timeZone)) throw new Error('Invalid time zone')
  const parts = readZonedParts(instant, timeZone)
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return zonedLocalToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    parts.hour,
    parts.minute,
    parts.second,
    timeZone,
  )
}

/** Calendar date as YYYY-MM-DD in the given IANA time zone. */
export function formatDateInTimeZone(instant: Date, timeZone: string): string {
  if (!isValidTimeZone(timeZone)) throw new Error('Invalid time zone')
  const parts = readZonedParts(instant, timeZone)
  const month = String(parts.month).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  return `${parts.year}-${month}-${day}`
}

bindAnalyticsTime(formatDateInTimeZone, localDayBounds)
