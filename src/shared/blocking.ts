import { DISPLAY_NAMES } from './constants'
import { findMatchingRule } from './rules'
import { isTrustedUnlockActive } from './unlock'
import type { BlockDecision, ExtensionSettings, WebsiteRule } from './types'
import { isLimitReached } from './time-utils'

export function getBlockDecision(
  url: string,
  settings: ExtensionSettings,
): BlockDecision {
  if (!settings.globalEnabled) return { blocked: false }

  const rule = findMatchingRule(url, settings.websites)
  if (!rule || !rule.enabled) return { blocked: false }
  if (isTrustedUnlockActive(rule)) return { blocked: false, rule }

  if (rule.blocking.enabled) {
    return { blocked: true, reason: 'blocked', rule }
  }

  if (
    rule.timeLimit.enabled &&
    isLimitReached(rule.usage.usedTodaySeconds, rule.timeLimit.dailyLimitMinutes)
  ) {
    return { blocked: true, reason: 'limit', rule }
  }

  return { blocked: false, rule }
}

export function isCompletelyBlocked(rule: WebsiteRule): boolean {
  return rule.enabled && rule.blocking.enabled
}

export function hasActiveTimeLimit(rule: WebsiteRule): boolean {
  return rule.enabled && rule.timeLimit.enabled && !rule.blocking.enabled
}

export function ruleStatusLabel(rule: WebsiteRule): string {
  if (!rule.enabled) return 'Paused'
  if (rule.blocking.enabled) return 'Blocked'
  if (
    rule.timeLimit.enabled &&
    isLimitReached(rule.usage.usedTodaySeconds, rule.timeLimit.dailyLimitMinutes)
  ) {
    return 'Limit reached'
  }
  if (rule.timeLimit.enabled) return 'Time limit'
  return 'Tracking'
}

export function friendlyDomain(domain: string): string {
  return DISPLAY_NAMES[domain] ?? domain
}
