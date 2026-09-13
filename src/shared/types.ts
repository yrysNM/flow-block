export interface WebsiteBlocking {
  enabled: boolean
}

export interface WebsiteTimeLimit {
  enabled: boolean
  dailyLimitMinutes: number
}

export interface WebsiteUsage {
  usedTodaySeconds: number
  lastUpdated: string
  notified80: boolean
  notified100: boolean
}

export interface WebsiteRule {
  id: string
  domain: string
  enabled: boolean
  blocking: WebsiteBlocking
  timeLimit: WebsiteTimeLimit
  usage: WebsiteUsage
  createdAt: string
  /** ISO timestamp. While this is in the future, the site is allowed through. */
  unlockedUntil?: string
}

export type UnlockRequestStatus = 'pending' | 'accepted' | 'denied'

export interface UnlockRequest {
  id: string
  token: string
  ruleId: string
  domain: string
  createdAt: string
  expiresAt: string
  status: UnlockRequestStatus
  decidedAt?: string
}

export interface NotificationSettings {
  at80Percent: boolean
  atLimit: boolean
}

export type ThemePreference = 'light' | 'dark' | 'system'

export interface ExtensionSettings {
  websites: WebsiteRule[]
  globalEnabled: boolean
  trackingEnabled: boolean
  lastResetDate: string
  notifications: NotificationSettings
  theme: ThemePreference
  unlockRequests: UnlockRequest[]
}

export interface ExportPayload {
  version: 1
  exportedAt: string
  websites: WebsiteRule[]
  settings: {
    globalEnabled: boolean
    trackingEnabled: boolean
    notifications: NotificationSettings
    theme: ThemePreference
  }
}

export type BlockReason = 'blocked' | 'limit'

export interface BlockDecision {
  blocked: boolean
  reason?: BlockReason
  rule?: WebsiteRule
}

export interface ActiveSession {
  ruleId: string
  domain: string
  startedAt: number
}

export type IdleState = 'active' | 'idle' | 'locked'

export interface TrackingContext {
  windowFocused: boolean
  idleState: IdleState
  tabUrl: string | undefined
  tabId: number | undefined
}

export type RuntimeMessage =
  | { type: 'FLUSH_SESSION' }
  | { type: 'GET_LIVE_SETTINGS' }
  | { type: 'EVALUATE_ACTIVE_TAB' }
  | { type: 'OPEN_OPTIONS'; hash?: string }

export interface LiveSettingsResponse {
  settings: ExtensionSettings
  liveUsageById: Record<string, number>
  session: ActiveSession | null
}
