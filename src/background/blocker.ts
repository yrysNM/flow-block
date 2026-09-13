import { getBlockDecision } from '../shared/blocking'
import { isHttpUrl } from '../shared/domain-matcher'
import type { BlockDecision, ExtensionSettings } from '../shared/types'

export function blockedPageUrl(decision: BlockDecision): string {
  const url = new URL(chrome.runtime.getURL('src/blocked/index.html'))
  if (decision.rule) {
    url.searchParams.set('domain', decision.rule.domain)
    url.searchParams.set(
      'limit',
      String(decision.rule.timeLimit.dailyLimitMinutes),
    )
    url.searchParams.set('used', String(decision.rule.usage.usedTodaySeconds))
    url.searchParams.set('ruleId', decision.rule.id)
  }
  if (decision.reason) {
    url.searchParams.set('reason', decision.reason)
  }
  return url.toString()
}

export function isExtensionPage(url: string | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'chrome-extension:' || parsed.protocol === 'moz-extension:'
  } catch {
    return url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')
  }
}

export function isBlockedPage(url: string | undefined): boolean {
  if (!url || !isExtensionPage(url)) return false
  return url.includes('blocked')
}

export async function enforceBlock(
  tabId: number,
  url: string | undefined,
  settings: ExtensionSettings,
): Promise<boolean> {
  if (!url || !isHttpUrl(url) || isBlockedPage(url)) return false

  const decision = getBlockDecision(url, settings)
  if (!decision.blocked) return false

  await chrome.tabs.update(tabId, { url: blockedPageUrl(decision) })
  return true
}
