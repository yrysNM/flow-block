import { formatDateInTimeZone, zonedLocalToUtc } from '@focusflow/shared-utils'

export function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function hourInZone(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  return Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24
}

export function shiftCivilDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days))
  const monthText = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dayText = String(next.getUTCDate()).padStart(2, '0')
  return `${next.getUTCFullYear()}-${monthText}-${dayText}`
}

/** A block that starts on the hour and ends before the next local midnight. */
export function blockOnDay(
  date: string,
  hour: number,
  durationMinutes: number,
  timeZone: string,
): { scheduledStart: string; scheduledEnd: string } | null {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  const start = zonedLocalToUtc(year, month, day, hour, 0, 0, timeZone)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  if (formatDateInTimeZone(start, timeZone) !== date) return null
  if (formatDateInTimeZone(end, timeZone) !== date) return null
  return { scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() }
}
