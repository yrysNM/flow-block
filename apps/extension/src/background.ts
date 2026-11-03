import type { FocusSessionView, WebsiteRuleView, WebsiteUsageResponse } from '@focusflow/shared-types'
import {
  CACHE_KEY,
  DEFAULT_API_BASE,
  SYNC_ALARM,
  applyServerSync,
  cacheDate,
  closeOpenVisit,
  decideCachedBlock,
  emptyCache,
  flushUsageQueue,
  type CachedRule,
  type FocusFlowCache,
  type PendingUsageEvent,
} from './cache'

interface LoginMessage {
  type: 'focusflow:login'
  email: string
  password: string
  apiBase: string
}

interface StatusMessage {
  type: 'focusflow:status' | 'focusflow:logout'
}

type ExtensionMessage = LoginMessage | StatusMessage

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOpenVisit(value: unknown): value is NonNullable<FocusFlowCache['openVisit']> {
  return isRecord(value)
    && typeof value.host === 'string'
    && typeof value.startedAt === 'number'
    && typeof value.clientEventId === 'string'
}

async function load(): Promise<FocusFlowCache> {
  const stored = await chrome.storage.local.get(CACHE_KEY)
  const value = stored[CACHE_KEY]
  if (!isRecord(value)) return emptyCache()
  return {
    ...emptyCache(),
    ...value,
    rules: Array.isArray(value.rules) ? value.rules as CachedRule[] : [],
    pendingEvents: Array.isArray(value.pendingEvents) ? value.pendingEvents as PendingUsageEvent[] : [],
    openVisit: isOpenVisit(value.openVisit) ? value.openVisit : null,
  }
}

async function save(cache: FocusFlowCache): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEY]: cache })
}

function apiBase(cache: FocusFlowCache): string {
  const base = cache.apiBase.trim().replace(/\/$/, '')
  return base.length > 0 ? base : DEFAULT_API_BASE
}

async function apiFetch<T>(cache: FocusFlowCache, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!headers.has('content-type') && init?.body) headers.set('content-type', 'application/json')
  if (cache.token) headers.set('authorization', `Bearer ${cache.token}`)
  const response = await fetch(`${apiBase(cache)}${path}`, { ...init, headers })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (response.status === 204) return undefined as T
  return await response.json() as T
}

function toCachedRule(rule: WebsiteRuleView, usedSeconds: number): CachedRule {
  return {
    id: rule.id,
    enabled: rule.enabled,
    mode: rule.mode,
    domain: rule.domain,
    scheduleStartMinute: rule.scheduleStartMinute,
    scheduleEndMinute: rule.scheduleEndMinute,
    dailyLimitMinutes: rule.dailyLimitMinutes,
    usedSeconds,
  }
}

async function pullServer(cache: FocusFlowCache): Promise<FocusFlowCache> {
  const [me, rules, usage, active] = await Promise.all([
    apiFetch<{ preferences: { timezone: string } }>(cache, '/api/auth/me'),
    apiFetch<WebsiteRuleView[]>(cache, '/api/websites'),
    apiFetch<WebsiteUsageResponse>(cache, '/api/websites/usage'),
    apiFetch<FocusSessionView | null>(cache, '/api/focus-sessions/active'),
  ])
  return applyServerSync(cache, {
    timezone: me.preferences.timezone,
    focusActive: Boolean(active && !active.endedAt),
    date: usage.date,
    rules: rules.map((rule) => toCachedRule(rule, 0)),
    totals: usage.totals.map((total) => ({ ruleId: total.ruleId, usedSeconds: total.usedSeconds })),
  })
}

async function postUsage(cache: FocusFlowCache, event: PendingUsageEvent): Promise<void> {
  await apiFetch(cache, '/api/websites/usage-events', {
    method: 'POST',
    body: JSON.stringify(event),
  })
}

function scheduleSync(): void {
  void chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 })
}

function hostFromUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.hostname
  } catch {
    return null
  }
}

async function enforce(cache: FocusFlowCache): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!tab?.id || !tab.url) return
  if (tab.url.startsWith(chrome.runtime.getURL('blocked.html'))) return
  const host = hostFromUrl(tab.url)
  if (!host) return
  const decision = decideCachedBlock(cache, host, new Date())
  if (!decision.block) return
  await chrome.tabs.update(tab.id, {
    url: chrome.runtime.getURL(`blocked.html?host=${encodeURIComponent(host)}`),
  })
}

async function settleVisit(cache: FocusFlowCache, now: Date): Promise<FocusFlowCache> {
  const previous = cache.openVisit
  let next = closeOpenVisit(cache, now.getTime(), cacheDate(cache, now))
  if (previous) {
    next = {
      ...next,
      openVisit: {
        host: previous.host,
        startedAt: now.getTime(),
        clientEventId: crypto.randomUUID(),
      },
    }
  }
  return next
}

async function runSync(): Promise<void> {
  let cache = await settleVisit(await load(), new Date())
  if (cache.token) {
    try {
      cache = await flushUsageQueue(cache, (event) => postUsage(cache, event))
    } catch {
      // The queue stays in storage. The next alarm tries again.
    }
    try {
      cache = await pullServer(cache)
    } catch {
      // Enforcement keeps using the last cached rules and focus flag.
    }
  }
  await save(cache)
  await enforce(cache)
}

async function onTabsChanged(): Promise<void> {
  let cache = await load()
  const now = new Date()
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const host = tab?.url && !tab.url.startsWith(chrome.runtime.getURL('blocked.html'))
    ? hostFromUrl(tab.url)
    : null
  const previous = cache.openVisit
  cache = closeOpenVisit(cache, now.getTime(), cacheDate(cache, now))
  if (host && tab?.id) {
    const decision = decideCachedBlock(cache, host, now)
    if (decision.block) {
      await save(cache)
      await chrome.tabs.update(tab.id, {
        url: chrome.runtime.getURL(`blocked.html?host=${encodeURIComponent(host)}`),
      })
      return
    }
    if (!previous || previous.host !== host) {
      cache = {
        ...cache,
        openVisit: { host, startedAt: now.getTime(), clientEventId: crypto.randomUUID() },
      }
    } else {
      cache = { ...cache, openVisit: previous }
    }
  }
  await save(cache)
}

async function login(email: string, password: string, apiBaseInput: string): Promise<{ ok: true } | { ok: false; message: string }> {
  let cache = await load()
  cache = { ...cache, apiBase: apiBaseInput.trim().replace(/\/$/, '') || DEFAULT_API_BASE, token: null }
  try {
    const response = await fetch(`${apiBase(cache)}/api/auth/extension/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) return { ok: false, message: 'Could not sign in.' }
    const body = await response.json() as { token?: string; preferences?: { timezone?: string } }
    if (!body.token) return { ok: false, message: 'The server did not return a session.' }
    cache = { ...cache, token: body.token, timezone: body.preferences?.timezone || 'UTC' }
    await save(cache)
    await runSync()
    return { ok: true }
  } catch {
    return { ok: false, message: 'Could not reach the API.' }
  }
}

async function logout(): Promise<{ ok: boolean; message: string }> {
  let cache = await load()
  if (cache.token) {
    try {
      cache = await flushUsageQueue(cache, (event) => postUsage(cache, event))
      await apiFetch(cache, '/api/auth/logout', { method: 'POST' })
    } catch {
      await save(cache)
      return { ok: false, message: 'Still signed in. Usage could not be sent yet.' }
    }
  }
  cache = {
    ...emptyCache(),
    apiBase: cache.apiBase,
    timezone: cache.timezone,
  }
  await save(cache)
  return { ok: true, message: 'Signed out.' }
}

function statusOf(cache: FocusFlowCache): { signedIn: boolean; focusActive: boolean; rules: number; pending: number; apiBase: string } {
  return {
    signedIn: Boolean(cache.token),
    focusActive: cache.focusActive,
    rules: cache.rules.length,
    pending: cache.pendingEvents.length,
    apiBase: cache.apiBase,
  }
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleSync()
  void runSync()
})

chrome.runtime.onStartup.addListener(() => {
  scheduleSync()
  void runSync()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== SYNC_ALARM) return
  void runSync()
})

chrome.tabs.onActivated.addListener(() => {
  void onTabsChanged()
})

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (!changeInfo.url && changeInfo.status !== 'complete') return
  void onTabsChanged()
})

chrome.windows.onFocusChanged.addListener(() => {
  void onTabsChanged()
})

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message?.type === 'focusflow:login') {
    void login(message.email, message.password, message.apiBase).then(sendResponse)
    return true
  }
  if (message?.type === 'focusflow:logout') {
    void logout().then(sendResponse)
    return true
  }
  if (message?.type === 'focusflow:status') {
    void load().then((cache) => sendResponse(statusOf(cache)))
    return true
  }
  return undefined
})
