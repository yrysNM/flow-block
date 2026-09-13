import {
  MAX_SESSION_GAP_SECONDS,
  SESSION_STORAGE_KEY,
} from '../shared/constants'
import { mutateSettings } from '../shared/storage'
import { clampElapsedSeconds, computeElapsedSeconds } from '../shared/time-utils'
import type { ActiveSession, WebsiteRule } from '../shared/types'
import { maybeNotifyUsage } from './notifications'
import type { TrackingTarget } from './tab-tracker'

let memorySession: ActiveSession | null = null

async function readPersistedSession(): Promise<ActiveSession | null> {
  if (!chrome.storage?.session) return memorySession
  const result = await chrome.storage.session.get(SESSION_STORAGE_KEY)
  const value = result[SESSION_STORAGE_KEY] as ActiveSession | undefined
  if (!value?.ruleId || typeof value.startedAt !== 'number') return null
  return value
}

async function persistSession(session: ActiveSession | null): Promise<void> {
  memorySession = session
  if (!chrome.storage?.session) return
  if (session) {
    await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: session })
  } else {
    await chrome.storage.session.remove(SESSION_STORAGE_KEY)
  }
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  return (await readPersistedSession()) ?? memorySession
}

export function applyUsageDelta(
  rule: WebsiteRule,
  elapsedSeconds: number,
  now = new Date(),
): WebsiteRule {
  if (elapsedSeconds <= 0) return rule
  return {
    ...rule,
    usage: {
      ...rule.usage,
      usedTodaySeconds: rule.usage.usedTodaySeconds + elapsedSeconds,
      lastUpdated: now.toISOString(),
    },
  }
}

export async function flushSession(options?: {
  continueSession?: boolean
  now?: number
}): Promise<WebsiteRule | null> {
  const session = await getActiveSession()
  if (!session) return null

  const now = options?.now ?? Date.now()
  const rawElapsed = computeElapsedSeconds(session.startedAt, now)
  const elapsed = clampElapsedSeconds(rawElapsed, MAX_SESSION_GAP_SECONDS)

  let updated: WebsiteRule | null = null
  await mutateSettings((settings) => ({
    ...settings,
    websites: settings.websites.map((rule) => {
      if (rule.id !== session.ruleId) return rule
      updated = applyUsageDelta(rule, elapsed, new Date(now))
      return updated
    }),
  }))

  if (options?.continueSession && updated) {
    await persistSession({
      ...session,
      startedAt: now,
    })
  } else {
    await persistSession(null)
  }

  if (updated) {
    await maybeNotifyUsage(updated)
  }
  return updated
}

export async function startSession(target: TrackingTarget, now = Date.now()): Promise<void> {
  const current = await getActiveSession()
  if (current?.ruleId === target.rule.id) {
    return
  }
  if (current) {
    await flushSession({ continueSession: false, now })
  }
  await persistSession({
    ruleId: target.rule.id,
    domain: target.rule.domain,
    startedAt: now,
  })
}

export async function stopSession(now = Date.now()): Promise<WebsiteRule | null> {
  return flushSession({ continueSession: false, now })
}

export async function syncTracking(target: TrackingTarget | null): Promise<WebsiteRule | null> {
  if (!target) {
    return stopSession()
  }

  const current = await getActiveSession()
  if (!current) {
    await startSession(target)
    return null
  }

  if (current.ruleId !== target.rule.id) {
    await startSession(target)
    return null
  }

  return flushSession({ continueSession: true })
}

export function liveUsedSeconds(
  rule: WebsiteRule,
  session: ActiveSession | null,
  now = Date.now(),
): number {
  if (!session || session.ruleId !== rule.id) {
    return rule.usage.usedTodaySeconds
  }
  const extra = clampElapsedSeconds(
    computeElapsedSeconds(session.startedAt, now),
    MAX_SESSION_GAP_SECONDS,
  )
  return rule.usage.usedTodaySeconds + extra
}

export async function recoverSession(target: TrackingTarget | null): Promise<void> {
  const session = await getActiveSession()
  if (!session) {
    if (target) await startSession(target)
    return
  }

  if (target?.rule.id === session.ruleId) {
    await flushSession({ continueSession: true })
    return
  }

  await stopSession()
  if (target) await startSession(target)
}
