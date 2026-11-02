const FOCUS_MIN_SECONDS = 60
const FOCUS_MAX_SECONDS = 3 * 60 * 60
const PRESET_MINUTES = [15, 25, 50] as const

/** Matches the 25 minute focus preset. */
export const DEFAULT_FOCUS_SECONDS = 25 * 60

export interface FocusDurationSelection {
  preset: number | 'custom'
  customMinutes: number
}

export interface AccountPreferenceInput {
  timezone?: string | null
  theme?: string | null
  weekStartsOn?: number | null
  focusDefaultSeconds?: number | null
  language?: string | null
}

export interface AccountPreferences {
  timezone: string
  theme: 'light' | 'dark' | 'system'
  weekStartsOn: number
  focusDefaultSeconds: number
  language: 'en'
}

function focusSecondsOrDefault(value: number | null | undefined): number {
  if (
    typeof value === 'number'
    && Number.isInteger(value)
    && value >= FOCUS_MIN_SECONDS
    && value <= FOCUS_MAX_SECONDS
  ) {
    return value
  }
  return DEFAULT_FOCUS_SECONDS
}

/** Map a stored row onto the public preference shape. Language is always English. */
export function accountPreferences(input: AccountPreferenceInput | null | undefined): AccountPreferences {
  const theme = input?.theme === 'light' || input?.theme === 'dark' || input?.theme === 'system'
    ? input.theme
    : 'system'
  const week = input?.weekStartsOn
  const weekStartsOn = typeof week === 'number' && Number.isInteger(week) && week >= 0 && week <= 6 ? week : 1
  const timezone = input?.timezone?.trim()
  return {
    timezone: timezone ? timezone : 'UTC',
    theme,
    weekStartsOn,
    focusDefaultSeconds: focusSecondsOrDefault(input?.focusDefaultSeconds),
    language: 'en',
  }
}

/**
 * Initial duration on the focus page.
 * Exact 15, 25, and 50 minute values select those presets. Anything else in range is custom.
 */
export function initialFocusSelection(focusDefaultSeconds: number | null | undefined): FocusDurationSelection {
  const seconds = focusSecondsOrDefault(focusDefaultSeconds)
  const preset = PRESET_MINUTES.find((minutes) => minutes * 60 === seconds)
  if (preset !== undefined) {
    return { preset, customMinutes: preset }
  }
  const minutes = Math.min(180, Math.max(1, Math.round(seconds / 60)))
  return { preset: 'custom', customMinutes: minutes }
}
