import AsyncStorage from '@react-native-async-storage/async-storage'
import { domainsOverlap, normalizeDomain } from './domain'
import type { AppSettings, UnlockRequest, WebsiteRule } from './types'

const SETTINGS_KEY = 'flow-block-mobile:settings'
const UNLOCK_REQUEST_HOURS = 24

export function createDefaultSettings(): AppSettings {
  return {
    websites: [],
    unlockRequests: [],
    protectionEnabled: true,
    vpnRunning: false,
    unlockBaseUrl: 'https://unlock.flowblock.local',
  }
}

function nextMidnight(now = new Date()): Date {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next
}

export function isTrustedUnlockActive(
  rule: Pick<WebsiteRule, 'unlockedUntil'>,
  now = new Date(),
): boolean {
  if (!rule.unlockedUntil) return false
  const until = Date.parse(rule.unlockedUntil)
  return Number.isFinite(until) && until > now.getTime()
}

export function isRequestOpen(request: UnlockRequest, now = new Date()): boolean {
  if (request.status !== 'pending') return false
  const expires = Date.parse(request.expiresAt)
  return Number.isFinite(expires) && expires > now.getTime()
}

export function activeBlockedDomains(settings: AppSettings, now = new Date()): string[] {
  if (!settings.protectionEnabled) return []
  return settings.websites
    .filter((rule) => rule.enabled && !isTrustedUnlockActive(rule, now))
    .map((rule) => rule.domain)
}

async function readRaw(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY)
  if (!raw) return createDefaultSettings()
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...createDefaultSettings(),
      ...parsed,
      websites: Array.isArray(parsed.websites) ? parsed.websites : [],
      unlockRequests: Array.isArray(parsed.unlockRequests) ? parsed.unlockRequests : [],
    }
  } catch {
    return createDefaultSettings()
  }
}

async function writeRaw(settings: AppSettings): Promise<AppSettings> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  return settings
}

export async function getSettings(): Promise<AppSettings> {
  return readRaw()
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  return writeRaw(settings)
}

export async function mutateSettings(
  updater: (current: AppSettings) => AppSettings,
): Promise<AppSettings> {
  const current = await readRaw()
  return writeRaw(updater(current))
}

export async function addWebsite(domainInput: string): Promise<WebsiteRule> {
  const domain = normalizeDomain(domainInput)
  if (!domain) {
    throw new Error('Enter a valid domain like youtube.com')
  }

  const settings = await mutateSettings((current) => {
    if (current.websites.some((item) => domainsOverlap(item.domain, domain))) {
      throw new Error('That domain (or a parent/child of it) is already on the list')
    }
    const rule: WebsiteRule = {
      id: cryptoRandomId(),
      domain,
      enabled: true,
      createdAt: new Date().toISOString(),
    }
    return { ...current, websites: [rule, ...current.websites] }
  })

  const created = settings.websites.find((item) => item.domain === domain)
  if (!created) throw new Error('Could not save website')
  return created
}

export async function updateWebsite(
  id: string,
  patch: Partial<Pick<WebsiteRule, 'enabled' | 'unlockedUntil'>>,
): Promise<WebsiteRule> {
  const settings = await mutateSettings((current) => ({
    ...current,
    websites: current.websites.map((rule) =>
      rule.id === id ? { ...rule, ...patch } : rule,
    ),
  }))
  const rule = settings.websites.find((item) => item.id === id)
  if (!rule) throw new Error('Website not found')
  return rule
}

export async function deleteWebsite(id: string): Promise<void> {
  await mutateSettings((current) => {
    const rule = current.websites.find((item) => item.id === id)
    if (!rule) throw new Error('Website not found')
    if (rule.enabled && !isTrustedUnlockActive(rule)) {
      throw new Error('Ask a trusted person to Accept an unlock request before deleting.')
    }
    return {
      ...current,
      websites: current.websites.filter((item) => item.id !== id),
      unlockRequests: current.unlockRequests.filter((item) => item.ruleId !== id),
    }
  })
}

export async function createUnlockRequest(ruleId: string): Promise<{
  request: UnlockRequest
  url: string
}> {
  const settings = await mutateSettings((current) => {
    const rule = current.websites.find((item) => item.id === ruleId)
    if (!rule) throw new Error('Website not found')

    const existing = current.unlockRequests.find(
      (request) => request.ruleId === ruleId && isRequestOpen(request),
    )
    if (existing) return current

    const now = new Date()
    const request: UnlockRequest = {
      id: cryptoRandomId(),
      token: cryptoRandomId(),
      ruleId: rule.id,
      domain: rule.domain,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + UNLOCK_REQUEST_HOURS * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    }
    return { ...current, unlockRequests: [request, ...current.unlockRequests] }
  })

  const request = settings.unlockRequests.find(
    (item) => item.ruleId === ruleId && (isRequestOpen(item) || item.status === 'pending'),
  )
  if (!request) throw new Error('Could not create unlock request')

  return { request, url: buildUnlockUrl(settings.unlockBaseUrl, request.token) }
}

export async function decideUnlockRequest(
  token: string,
  decision: 'accepted' | 'denied',
): Promise<UnlockRequest> {
  const settings = await mutateSettings((current) => {
    const request = current.unlockRequests.find((item) => item.token === token)
    if (!request) throw new Error('This unlock link is invalid.')
    if (request.status !== 'pending') return current
    if (!isRequestOpen(request)) {
      throw new Error('This unlock request has expired. Ask them to share a new link.')
    }

    const decided: UnlockRequest = {
      ...request,
      status: decision,
      decidedAt: new Date().toISOString(),
    }

    const websites =
      decision === 'accepted'
        ? current.websites.map((rule) =>
            rule.id === request.ruleId
              ? { ...rule, unlockedUntil: nextMidnight().toISOString() }
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
  if (!decided) throw new Error('Could not save this decision')
  return decided
}

export async function getUnlockRequest(token: string): Promise<{
  request: UnlockRequest
  rule?: WebsiteRule
}> {
  const settings = await getSettings()
  const request = settings.unlockRequests.find((item) => item.token === token)
  if (!request) throw new Error('This unlock link is invalid.')
  const rule = settings.websites.find((item) => item.id === request.ruleId)
  return { request, rule }
}

export function buildUnlockUrl(baseUrl: string, token: string): string {
  const url = new URL('/unlock', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  url.searchParams.set('token', token)
  return url.toString()
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
