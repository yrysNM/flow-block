import { DISPLAY_NAMES } from './constants'

export function localDateKey(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nextLocalMidnight(now: Date = new Date()): Date {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next
}

export function computeElapsedSeconds(startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

export function clampElapsedSeconds(
  elapsedSeconds: number,
  maxGapSeconds: number,
): number {
  if (elapsedSeconds <= maxGapSeconds) return elapsedSeconds
  return 0
}

export function minutesToSeconds(minutes: number): number {
  return Math.max(0, Math.round(minutes * 60))
}

export function secondsToMinutes(seconds: number): number {
  return Math.floor(Math.max(0, seconds) / 60)
}

export function remainingSeconds(
  usedTodaySeconds: number,
  dailyLimitMinutes: number,
): number {
  return Math.max(0, minutesToSeconds(dailyLimitMinutes) - usedTodaySeconds)
}

export function usageRatio(
  usedTodaySeconds: number,
  dailyLimitMinutes: number,
): number {
  const limit = minutesToSeconds(dailyLimitMinutes)
  if (limit <= 0) return 1
  return Math.min(1, usedTodaySeconds / limit)
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (hours === 0) return `${minutes} min`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

export function formatCompact(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (hours === 0) return `${minutes}m`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

export function formatLimitMinutes(minutes: number): string {
  if (minutes % 60 === 0 && minutes >= 60) {
    const hours = minutes / 60
    return hours === 1 ? '1 hour' : `${hours} hours`
  }
  return `${minutes} min`
}

export function displayName(domain: string): string {
  return DISPLAY_NAMES[domain] ?? domain
}

export function isLimitReached(
  usedTodaySeconds: number,
  dailyLimitMinutes: number,
): boolean {
  return usedTodaySeconds >= minutesToSeconds(dailyLimitMinutes)
}
