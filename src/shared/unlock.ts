import { isLimitReached, nextLocalMidnight } from './time-utils'
import type { UnlockRequest, UnlockRequestStatus, WebsiteRule } from './types'

export const UNLOCK_REQUEST_HOURS = 24

export function isTrustedUnlockActive(
  rule: Pick<WebsiteRule, 'unlockedUntil'>,
  now = new Date(),
): boolean {
  if (!rule.unlockedUntil) return false
  const until = Date.parse(rule.unlockedUntil)
  return Number.isFinite(until) && until > now.getTime()
}

export function isRuleCurrentlyBlocking(
  rule: WebsiteRule,
  now = new Date(),
): boolean {
  if (!rule.enabled) return false
  if (isTrustedUnlockActive(rule, now)) return false
  if (rule.blocking.enabled) return true
  return (
    rule.timeLimit.enabled &&
    isLimitReached(rule.usage.usedTodaySeconds, rule.timeLimit.dailyLimitMinutes)
  )
}

export function requiresTrustedUnlock(rule: WebsiteRule, now = new Date()): boolean {
  return isRuleCurrentlyBlocking(rule, now)
}

export function unlockExpiresAt(now = new Date()): Date {
  return nextLocalMidnight(now)
}

export function requestExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + UNLOCK_REQUEST_HOURS * 60 * 60 * 1000)
}

export function isRequestOpen(request: UnlockRequest, now = new Date()): boolean {
  if (request.status !== 'pending') return false
  const expires = Date.parse(request.expiresAt)
  return Number.isFinite(expires) && expires > now.getTime()
}

export function createUnlockRequestRecord(
  rule: WebsiteRule,
  now = new Date(),
): UnlockRequest {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    ruleId: rule.id,
    domain: rule.domain,
    createdAt: now.toISOString(),
    expiresAt: requestExpiresAt(now).toISOString(),
    status: 'pending',
  }
}

export function applyUnlockDecision(
  request: UnlockRequest,
  decision: Exclude<UnlockRequestStatus, 'pending'>,
  now = new Date(),
): UnlockRequest {
  return {
    ...request,
    status: decision,
    decidedAt: now.toISOString(),
  }
}

/** Preview gallery uses a mocked runtime id so designers can still see Accept / Denied. */
export const PREVIEW_RUNTIME_ID = 'preview'

/**
 * Hide Accept / Denied when the requester opens the unlock page in their own
 * extension browser. A hosted page without the extension can still show them.
 */
export function shouldHideUnlockDecisionButtons(
  runtimeId: string | undefined = typeof chrome !== 'undefined'
    ? chrome.runtime?.id
    : undefined,
): boolean {
  return Boolean(runtimeId) && runtimeId !== PREVIEW_RUNTIME_ID
}

export function buildUnlockPageUrl(token: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    const url = new URL(chrome.runtime.getURL('src/unlock/index.html'))
    url.searchParams.set('token', token)
    return url.toString()
  }
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://unlock.local'
  const url = new URL('/src/unlock/index.html', origin)
  url.searchParams.set('token', token)
  return url.toString()
}
