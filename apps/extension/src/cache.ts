import {
  formatDateInTimeZone,
  hostMatchesDomain,
  minuteInTimeZone,
  shouldBlockWebsite,
  type BlockingDecision,
  type BlockingRule,
} from '@focusflow/shared-utils'

export const DEFAULT_API_BASE = 'http://127.0.0.1:3001'
export const SYNC_ALARM = 'focusflow-sync'
export const CACHE_KEY = 'focusflow'

export interface CachedRule extends BlockingRule {
  id: string
}

export interface PendingUsageEvent {
  clientEventId: string
  domain: string
  seconds: number
  occurredAt: string
}

export interface OpenVisit {
  host: string
  startedAt: number
  clientEventId: string
}

export interface FocusFlowCache {
  apiBase: string
  token: string | null
  timezone: string
  rules: CachedRule[]
  focusActive: boolean
  usageDate: string
  pendingEvents: PendingUsageEvent[]
  openVisit: OpenVisit | null
}

export interface ServerSync {
  timezone: string
  focusActive: boolean
  date: string
  rules: CachedRule[]
  totals: Array<{ ruleId: string; usedSeconds: number }>
}

export function emptyCache(): FocusFlowCache {
  return {
    apiBase: DEFAULT_API_BASE,
    token: null,
    timezone: 'UTC',
    rules: [],
    focusActive: false,
    usageDate: '',
    pendingEvents: [],
    openVisit: null,
  }
}

export function cacheDate(cache: FocusFlowCache, now: Date): string {
  try {
    return formatDateInTimeZone(now, cache.timezone || 'UTC')
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

export function enqueueUsage(cache: FocusFlowCache, event: PendingUsageEvent): FocusFlowCache {
  if (cache.pendingEvents.some((item) => item.clientEventId === event.clientEventId)) return cache
  return { ...cache, pendingEvents: [...cache.pendingEvents, event] }
}

function withToday(cache: FocusFlowCache, today: string): FocusFlowCache {
  if (cache.usageDate === today) return cache
  return {
    ...cache,
    usageDate: today,
    rules: cache.rules.map((rule) => ({ ...rule, usedSeconds: 0 })),
  }
}

function addLocalSeconds(cache: FocusFlowCache, domain: string, seconds: number): FocusFlowCache {
  return {
    ...cache,
    rules: cache.rules.map((rule) => (
      hostMatchesDomain(domain, rule.domain)
        ? { ...rule, usedSeconds: rule.usedSeconds + seconds }
        : rule
    )),
  }
}

/** Close the open visit into the offline queue. A repeat of the same client event id is ignored. */
export function closeOpenVisit(cache: FocusFlowCache, nowMs: number, today: string): FocusFlowCache {
  const open = cache.openVisit
  if (!open) return cache
  const seconds = Math.max(0, Math.floor((nowMs - open.startedAt) / 1000))
  let next: FocusFlowCache = { ...cache, openVisit: null }
  if (seconds < 1) return next
  next = withToday(next, today)
  const queued = enqueueUsage(next, {
    clientEventId: open.clientEventId,
    domain: open.host,
    seconds,
    occurredAt: new Date(nowMs).toISOString(),
  })
  if (queued === next) return next
  return addLocalSeconds(queued, open.host, seconds)
}

export function decideCachedBlock(cache: FocusFlowCache, host: string, now: Date): BlockingDecision {
  let nowMinute = now.getUTCHours() * 60 + now.getUTCMinutes()
  try {
    nowMinute = minuteInTimeZone(now, cache.timezone || 'UTC')
  } catch {
    nowMinute = now.getHours() * 60 + now.getMinutes()
  }
  return shouldBlockWebsite({
    focusActive: cache.focusActive,
    nowMinute,
    host,
    rules: cache.rules,
  })
}

export function applyServerSync(cache: FocusFlowCache, server: ServerSync): FocusFlowCache {
  const used = new Map(server.totals.map((total) => [total.ruleId, total.usedSeconds]))
  let next: FocusFlowCache = {
    ...cache,
    timezone: server.timezone || 'UTC',
    focusActive: server.focusActive,
    usageDate: server.date,
    rules: server.rules.map((rule) => ({
      ...rule,
      usedSeconds: used.get(rule.id) ?? 0,
    })),
  }
  for (const event of cache.pendingEvents) {
    if (!event.occurredAt.startsWith(server.date)) continue
    next = addLocalSeconds(next, event.domain, event.seconds)
  }
  return next
}

export async function flushUsageQueue(
  cache: FocusFlowCache,
  post: (event: PendingUsageEvent) => Promise<void>,
): Promise<FocusFlowCache> {
  const remaining: PendingUsageEvent[] = []
  for (let index = 0; index < cache.pendingEvents.length; index += 1) {
    const event = cache.pendingEvents[index]
    if (!event) continue
    try {
      await post(event)
    } catch {
      remaining.push(...cache.pendingEvents.slice(index))
      break
    }
  }
  return { ...cache, pendingEvents: remaining }
}
