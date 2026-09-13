import {
  DEFAULT_DAILY_LIMIT_MINUTES,
  DEFAULT_NOTIFICATIONS,
  MIN_DAILY_LIMIT_MINUTES,
  MAX_DAILY_LIMIT_MINUTES,
  SETTINGS_STORAGE_KEY,
} from './constants'
import { domainsOverlap, normalizeDomain } from './domain-matcher'
import { localDateKey } from './time-utils'
import {
  applyUnlockDecision,
  buildUnlockPageUrl,
  createUnlockRequestRecord,
  isRequestOpen,
  isRuleCurrentlyBlocking,
  unlockExpiresAt,
} from './unlock'
import type {
  ExtensionSettings,
  NotificationSettings,
  ThemePreference,
  UnlockRequest,
  WebsiteRule,
} from './types'

export interface StorageAdapter {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  subscribe?(
    key: string,
    listener: (value: unknown) => void,
  ): () => void
}

function createChromeAdapter(): StorageAdapter {
  return {
    async get(key) {
      const result = await chrome.storage.local.get(key)
      return result[key]
    },
    async set(key, value) {
      await chrome.storage.local.set({ [key]: value })
    },
    subscribe(key, listener) {
      const handler = (
        changes: { [key: string]: chrome.storage.StorageChange },
        area: string,
      ) => {
        if (area !== 'local' || !(key in changes)) return
        listener(changes[key]?.newValue)
      }
      chrome.storage.onChanged.addListener(handler)
      return () => chrome.storage.onChanged.removeListener(handler)
    },
  }
}

let adapter: StorageAdapter | null = null
let writeChain: Promise<unknown> = Promise.resolve()

export function setStorageAdapter(next: StorageAdapter | null): void {
  adapter = next
}

export function createMemoryAdapter(initial?: unknown): StorageAdapter {
  const store = new Map<string, unknown>()
  if (initial !== undefined) {
    store.set(SETTINGS_STORAGE_KEY, initial)
  }
  const listeners = new Set<(value: unknown) => void>()
  return {
    async get(key) {
      return store.get(key)
    },
    async set(key, value) {
      store.set(key, value)
      if (key === SETTINGS_STORAGE_KEY) {
        for (const listener of listeners) listener(value)
      }
    },
    subscribe(key, listener) {
      if (key !== SETTINGS_STORAGE_KEY) return () => undefined
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function getAdapter(): StorageAdapter {
  if (adapter) return adapter
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    adapter = createChromeAdapter()
    return adapter
  }
  throw new Error('Storage adapter is not available')
}

function emptyUsage(now = new Date()): WebsiteRule['usage'] {
  return {
    usedTodaySeconds: 0,
    lastUpdated: now.toISOString(),
    notified80: false,
    notified100: false,
  }
}

export function createDefaultSettings(now = new Date()): ExtensionSettings {
  return {
    websites: [],
    globalEnabled: true,
    trackingEnabled: true,
    lastResetDate: localDateKey(now),
    notifications: { ...DEFAULT_NOTIFICATIONS },
    theme: 'system',
    unlockRequests: [],
  }
}

export function createWebsiteRule(
  domain: string,
  options?: {
    blocking?: boolean
    timeLimit?: boolean
    dailyLimitMinutes?: number
    now?: Date
  },
): WebsiteRule {
  const now = options?.now ?? new Date()
  const blockingEnabled = options?.blocking ?? false
  const timeLimitEnabled = options?.timeLimit ?? !blockingEnabled
  const dailyLimitMinutes = clampLimit(
    options?.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES,
  )

  return {
    id: crypto.randomUUID(),
    domain,
    enabled: true,
    blocking: { enabled: blockingEnabled },
    timeLimit: {
      enabled: timeLimitEnabled,
      dailyLimitMinutes,
    },
    usage: emptyUsage(now),
    createdAt: now.toISOString(),
  }
}

export function clampLimit(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_DAILY_LIMIT_MINUTES
  return Math.min(
    MAX_DAILY_LIMIT_MINUTES,
    Math.max(MIN_DAILY_LIMIT_MINUTES, Math.round(minutes)),
  )
}

export function sanitizeSettings(raw: unknown): ExtensionSettings {
  const fallback = createDefaultSettings()
  if (!raw || typeof raw !== 'object') return fallback
  const value = raw as Partial<ExtensionSettings>

  const websites = Array.isArray(value.websites)
    ? value.websites
        .map((item) => sanitizeWebsite(item))
        .filter((item): item is WebsiteRule => item !== null)
    : []

  const notifications = sanitizeNotifications(value.notifications)

  return {
    websites,
    globalEnabled: value.globalEnabled !== false,
    trackingEnabled: value.trackingEnabled !== false,
    lastResetDate:
      typeof value.lastResetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastResetDate)
        ? value.lastResetDate
        : fallback.lastResetDate,
    notifications,
    theme: sanitizeTheme(value.theme),
    unlockRequests: sanitizeUnlockRequests(value.unlockRequests),
  }
}

function sanitizeTheme(theme: unknown): ThemePreference {
  if (theme === 'light' || theme === 'dark' || theme === 'system') return theme
  return 'system'
}

function sanitizeNotifications(raw: unknown): NotificationSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_NOTIFICATIONS }
  }
  const value = raw as Partial<NotificationSettings>
  return {
    at80Percent: value.at80Percent !== false,
    atLimit: value.atLimit !== false,
  }
}

function sanitizeWebsite(raw: unknown): WebsiteRule | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<WebsiteRule>
  const domain = typeof value.domain === 'string' ? normalizeDomain(value.domain) : null
  if (!domain) return null

  const dailyLimitMinutes = clampLimit(
    typeof value.timeLimit?.dailyLimitMinutes === 'number'
      ? value.timeLimit.dailyLimitMinutes
      : DEFAULT_DAILY_LIMIT_MINUTES,
  )

  const usedTodaySeconds =
    typeof value.usage?.usedTodaySeconds === 'number' && value.usage.usedTodaySeconds >= 0
      ? Math.floor(value.usage.usedTodaySeconds)
      : 0

  return {
    id: typeof value.id === 'string' && value.id ? value.id : crypto.randomUUID(),
    domain,
    enabled: value.enabled !== false,
    blocking: { enabled: Boolean(value.blocking?.enabled) },
    timeLimit: {
      enabled:
        typeof value.timeLimit?.enabled === 'boolean'
          ? value.timeLimit.enabled
          : !value.blocking?.enabled,
      dailyLimitMinutes,
    },
    usage: {
      usedTodaySeconds,
      lastUpdated:
        typeof value.usage?.lastUpdated === 'string'
          ? value.usage.lastUpdated
          : new Date().toISOString(),
      notified80: Boolean(value.usage?.notified80),
      notified100: Boolean(value.usage?.notified100),
    },
    createdAt:
      typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    unlockedUntil: sanitizeTimestamp(value.unlockedUntil),
  }
}

function sanitizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined
}

function sanitizeUnlockRequests(raw: unknown): UnlockRequest[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => sanitizeUnlockRequest(item))
    .filter((item): item is UnlockRequest => item !== null)
}

function sanitizeUnlockRequest(raw: unknown): UnlockRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<UnlockRequest>
  if (typeof value.token !== 'string' || !value.token) return null
  if (typeof value.ruleId !== 'string' || !value.ruleId) return null
  if (typeof value.domain !== 'string' || !value.domain) return null
  const status =
    value.status === 'accepted' || value.status === 'denied' || value.status === 'pending'
      ? value.status
      : 'pending'
  return {
    id: typeof value.id === 'string' && value.id ? value.id : crypto.randomUUID(),
    token: value.token,
    ruleId: value.ruleId,
    domain: value.domain,
    createdAt: sanitizeTimestamp(value.createdAt) ?? new Date().toISOString(),
    expiresAt: sanitizeTimestamp(value.expiresAt) ?? new Date().toISOString(),
    status,
    decidedAt: sanitizeTimestamp(value.decidedAt),
  }
}

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await getAdapter().get(SETTINGS_STORAGE_KEY)
  return sanitizeSettings(stored)
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await getAdapter().set(SETTINGS_STORAGE_KEY, sanitizeSettings(settings))
}

export async function mutateSettings(
  mutator: (settings: ExtensionSettings) => ExtensionSettings,
): Promise<ExtensionSettings> {
  const run = writeChain.then(async () => {
    const current = await getSettings()
    const next = sanitizeSettings(mutator(current))
    await saveSettings(next)
    return next
  })
  writeChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function addWebsite(input: {
  domain: string
  blocking?: boolean
  timeLimit?: boolean
  dailyLimitMinutes?: number
}): Promise<WebsiteRule> {
  const domain = normalizeDomain(input.domain)
  if (!domain) {
    throw new Error('Enter a valid website domain, like youtube.com')
  }

  const created = createWebsiteRule(domain, {
    blocking: input.blocking,
    timeLimit: input.timeLimit,
    dailyLimitMinutes: input.dailyLimitMinutes,
  })

  await mutateSettings((settings) => {
    const duplicate = settings.websites.find((rule) => domainsOverlap(rule.domain, domain))
    if (duplicate) {
      throw new Error(`A rule for ${duplicate.domain} already covers this website`)
    }
    return { ...settings, websites: [created, ...settings.websites] }
  })

  return created
}

export async function updateWebsite(
  id: string,
  patch: Partial<
    Pick<WebsiteRule, 'enabled' | 'blocking' | 'timeLimit' | 'usage' | 'unlockedUntil'>
  >,
): Promise<WebsiteRule | null> {
  let updated: WebsiteRule | null = null
  await mutateSettings((settings) => ({
    ...settings,
    websites: settings.websites.map((rule) => {
      if (rule.id !== id) return rule
      if (wouldSelfUnlock(rule, patch)) {
        throw new Error(
          'This website stays locked until a trusted person Accepts an unlock request.',
        )
      }
      updated = {
        ...rule,
        ...patch,
        blocking: patch.blocking ? { ...rule.blocking, ...patch.blocking } : rule.blocking,
        timeLimit: patch.timeLimit
          ? {
              ...rule.timeLimit,
              ...patch.timeLimit,
              dailyLimitMinutes: clampLimit(
                patch.timeLimit.dailyLimitMinutes ?? rule.timeLimit.dailyLimitMinutes,
              ),
            }
          : rule.timeLimit,
        usage: patch.usage ? { ...rule.usage, ...patch.usage } : rule.usage,
      }
      return updated
    }),
  }))
  return updated
}

function wouldSelfUnlock(
  rule: WebsiteRule,
  patch: Partial<Pick<WebsiteRule, 'enabled' | 'blocking' | 'timeLimit' | 'usage' | 'unlockedUntil'>>,
): boolean {
  if (!isRuleCurrentlyBlocking(rule)) return false
  if (patch.unlockedUntil) return false
  if (patch.enabled === false) return true
  if (patch.blocking?.enabled === false && rule.blocking.enabled) return true
  if (
    typeof patch.usage?.usedTodaySeconds === 'number' &&
    patch.usage.usedTodaySeconds < rule.usage.usedTodaySeconds
  ) {
    return true
  }
  if (
    typeof patch.timeLimit?.dailyLimitMinutes === 'number' &&
    patch.timeLimit.dailyLimitMinutes > rule.timeLimit.dailyLimitMinutes
  ) {
    return true
  }
  return false
}

export async function deleteWebsite(id: string): Promise<void> {
  await mutateSettings((settings) => {
    const rule = settings.websites.find((item) => item.id === id)
    if (rule && isRuleCurrentlyBlocking(rule)) {
      throw new Error(
        'This website stays locked until a trusted person Accepts an unlock request.',
      )
    }
    return {
      ...settings,
      websites: settings.websites.filter((website) => website.id !== id),
      unlockRequests: settings.unlockRequests.filter((request) => request.ruleId !== id),
    }
  })
}

export async function getWebsiteRule(id: string): Promise<WebsiteRule | undefined> {
  const settings = await getSettings()
  return settings.websites.find((rule) => rule.id === id)
}

export async function resetDailyUsage(now = new Date()): Promise<ExtensionSettings> {
  return mutateSettings((settings) => ({
    ...settings,
    lastResetDate: localDateKey(now),
    websites: settings.websites.map((rule) => ({
      ...rule,
      usage: emptyUsage(now),
    })),
  }))
}

export async function resetAllStatistics(now = new Date()): Promise<ExtensionSettings> {
  return resetDailyUsage(now)
}

export function subscribeToSettings(
  listener: (settings: ExtensionSettings) => void,
): () => void {
  const current = getAdapter()
  if (!current.subscribe) return () => {}
  return current.subscribe(SETTINGS_STORAGE_KEY, (value) => {
    listener(sanitizeSettings(value))
  })
}

export function findOverlappingRule(
  domain: string,
  websites: WebsiteRule[],
  ignoreId?: string,
): WebsiteRule | undefined {
  return websites.find(
    (rule) => rule.id !== ignoreId && domainsOverlap(rule.domain, domain),
  )
}

export async function createUnlockRequest(ruleId: string): Promise<{
  request: UnlockRequest
  url: string
}> {
  const settings = await mutateSettings((current) => {
    const rule = current.websites.find((item) => item.id === ruleId)
    if (!rule) {
      throw new Error('Website not found')
    }

    const existing = current.unlockRequests.find(
      (request) => request.ruleId === ruleId && isRequestOpen(request),
    )
    if (existing) return current

    return {
      ...current,
      unlockRequests: [createUnlockRequestRecord(rule), ...current.unlockRequests],
    }
  })

  const created = settings.unlockRequests.find(
    (request) => request.ruleId === ruleId && (isRequestOpen(request) || request.status === 'pending'),
  )
  if (!created) {
    throw new Error('Could not create an unlock request')
  }

  return { request: created, url: buildUnlockPageUrl(created.token) }
}

export async function decideUnlockRequest(
  token: string,
  decision: 'accepted' | 'denied',
): Promise<UnlockRequest> {
  const settings = await mutateSettings((current) => {
    const request = current.unlockRequests.find((item) => item.token === token)
    if (!request) {
      throw new Error('This unlock link is invalid.')
    }
    if (request.status !== 'pending') {
      return current
    }
    if (!isRequestOpen(request)) {
      throw new Error('This unlock request has expired. Ask them to share a new link.')
    }

    const decided = applyUnlockDecision(request, decision)
    const websites =
      decision === 'accepted'
        ? current.websites.map((rule) =>
            rule.id === request.ruleId
              ? { ...rule, unlockedUntil: unlockExpiresAt().toISOString() }
              : rule,
          )
        : current.websites

    return {
      ...current,
      websites,
      unlockRequests: current.unlockRequests.map((item) =>
        item.token === token ? decided : item,
      ),
    }
  })

  const decided = settings.unlockRequests.find((item) => item.token === token)
  if (!decided) {
    throw new Error('Could not save this decision')
  }
  return decided
}

export async function getUnlockRequest(token: string): Promise<{
  request: UnlockRequest
  rule?: WebsiteRule
}> {
  const settings = await getSettings()
  const request = settings.unlockRequests.find((item) => item.token === token)
  if (!request) {
    throw new Error('This unlock link is invalid.')
  }
  const rule = settings.websites.find((item) => item.id === request.ruleId)
  return { request, rule }
}
