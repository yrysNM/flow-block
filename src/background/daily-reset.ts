import { DAILY_RESET_ALARM } from '../shared/constants'
import { mutateSettings } from '../shared/storage'
import { localDateKey, nextLocalMidnight } from '../shared/time-utils'
import type { ExtensionSettings } from '../shared/types'

export function needsDailyReset(
  settings: ExtensionSettings,
  now = new Date(),
): boolean {
  return settings.lastResetDate !== localDateKey(now)
}

export function withDailyReset(
  settings: ExtensionSettings,
  now = new Date(),
): ExtensionSettings {
  if (!needsDailyReset(settings, now)) return settings
  const timestamp = now.toISOString()
  return {
    ...settings,
    lastResetDate: localDateKey(now),
    websites: settings.websites.map((rule) => ({
      ...rule,
      usage: {
        usedTodaySeconds: 0,
        lastUpdated: timestamp,
        notified80: false,
        notified100: false,
      },
    })),
  }
}

export async function maybeResetDailyUsage(now = new Date()): Promise<ExtensionSettings> {
  return mutateSettings((settings) => withDailyReset(settings, now))
}

export async function scheduleDailyReset(now = new Date()): Promise<void> {
  if (!chrome.alarms?.create) return
  await chrome.alarms.create(DAILY_RESET_ALARM, {
    when: nextLocalMidnight(now).getTime(),
  })
}
