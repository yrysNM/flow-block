export const EXTENSION_NAME = 'Website Blocker'
export const SETTINGS_STORAGE_KEY = 'website-blocker:settings'
export const SESSION_STORAGE_KEY = 'website-blocker:active-session'

export const PERSIST_ALARM = 'persist-usage'
export const DAILY_RESET_ALARM = 'daily-reset'

/** Chrome honors a 30-second floor for repeating alarms in production. */
export const PERSIST_ALARM_PERIOD_MINUTES = 0.5

export const IDLE_DETECTION_INTERVAL_SECONDS = 60

/** Ignore unpersisted gaps larger than this; the machine was likely asleep. */
export const MAX_SESSION_GAP_SECONDS = 5 * 60

export const LIMIT_PRESETS_MINUTES = [5, 15, 30, 60, 120] as const

export const DEFAULT_DAILY_LIMIT_MINUTES = 60

export const MIN_DAILY_LIMIT_MINUTES = 1
export const MAX_DAILY_LIMIT_MINUTES = 24 * 60

export const DISPLAY_NAMES: Record<string, string> = {
  'youtube.com': 'YouTube',
  'reddit.com': 'Reddit',
  'instagram.com': 'Instagram',
  'twitter.com': 'Twitter',
  'x.com': 'X',
  'facebook.com': 'Facebook',
  'tiktok.com': 'TikTok',
  'netflix.com': 'Netflix',
  'twitch.tv': 'Twitch',
  'linkedin.com': 'LinkedIn',
  'pinterest.com': 'Pinterest',
  'discord.com': 'Discord',
  'amazon.com': 'Amazon',
  'news.ycombinator.com': 'Hacker News',
}

export const DEFAULT_NOTIFICATIONS = {
  at80Percent: true,
  atLimit: true,
} as const
