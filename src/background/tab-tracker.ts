import { getBlockDecision } from '../shared/blocking'
import { findMatchingRule } from '../shared/rules'
import type {
  ExtensionSettings,
  IdleState,
  TrackingContext,
  WebsiteRule,
} from '../shared/types'
import { isHttpUrl } from '../shared/domain-matcher'

export interface TrackingTarget {
  rule: WebsiteRule
  tabId: number | undefined
  url: string
}

export function isTrackableUrl(url: string | undefined): url is string {
  return typeof url === 'string' && isHttpUrl(url)
}

export function resolveTrackingTarget(
  context: TrackingContext,
  settings: ExtensionSettings,
): TrackingTarget | null {
  if (!context.windowFocused) return null
  if (context.idleState !== 'active') return null
  if (!settings.globalEnabled || !settings.trackingEnabled) return null
  if (!isTrackableUrl(context.tabUrl)) return null

  const rule = findMatchingRule(context.tabUrl, settings.websites)
  if (!rule || !rule.enabled) return null
  if (rule.blocking.enabled) return null

  return {
    rule,
    tabId: context.tabId,
    url: context.tabUrl,
  }
}

export function shouldBlockUrl(
  url: string | undefined,
  settings: ExtensionSettings,
): ReturnType<typeof getBlockDecision> {
  if (!isTrackableUrl(url)) return { blocked: false }
  return getBlockDecision(url, settings)
}

export function isFocusedWindow(windowId: number): boolean {
  return windowId !== chrome.windows.WINDOW_ID_NONE
}

export async function queryIdleState(): Promise<IdleState> {
  if (!chrome.idle?.queryState) return 'active'
  return chrome.idle.queryState(60)
}

export async function getFocusedWindowId(): Promise<number> {
  try {
    const focused = await chrome.windows.getLastFocused()
    if (!focused?.focused) return chrome.windows.WINDOW_ID_NONE
    return focused.id ?? chrome.windows.WINDOW_ID_NONE
  } catch {
    return chrome.windows.WINDOW_ID_NONE
  }
}

export async function getActiveTabInWindow(
  windowId: number,
): Promise<chrome.tabs.Tab | undefined> {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return undefined
  const tabs = await chrome.tabs.query({ active: true, windowId })
  return tabs[0]
}

export async function captureTrackingContext(): Promise<TrackingContext> {
  const idleState = await queryIdleState()
  const windowId = await getFocusedWindowId()
  const tab = await getActiveTabInWindow(windowId)
  return {
    windowFocused: isFocusedWindow(windowId),
    idleState,
    tabUrl: tab?.url,
    tabId: tab?.id,
  }
}
