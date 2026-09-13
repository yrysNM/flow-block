import {
  DAILY_RESET_ALARM,
  IDLE_DETECTION_INTERVAL_SECONDS,
  PERSIST_ALARM,
  PERSIST_ALARM_PERIOD_MINUTES,
} from '../shared/constants'
import type { LiveSettingsResponse, RuntimeMessage } from '../shared/types'
import { isLimitReached } from '../shared/time-utils'
import { enforceBlock, isBlockedPage } from './blocker'
import { maybeResetDailyUsage, scheduleDailyReset } from './daily-reset'
import {
  captureTrackingContext,
  resolveTrackingTarget,
} from './tab-tracker'
import {
  flushSession,
  getActiveSession,
  liveUsedSeconds,
  recoverSession,
  stopSession,
  syncTracking,
} from './time-tracker'

let booting: Promise<void> | null = null

async function evaluate(options?: { persist?: boolean }): Promise<void> {
  const settings = await maybeResetDailyUsage()
  const context = await captureTrackingContext()

  if (context.tabId !== undefined && context.tabUrl && !isBlockedPage(context.tabUrl)) {
    const blocked = await enforceBlock(context.tabId, context.tabUrl, settings)
    if (blocked) {
      await stopSession()
      return
    }
  }

  const target = resolveTrackingTarget(context, settings)
  if (
    target &&
    target.rule.timeLimit.enabled &&
    isLimitReached(target.rule.usage.usedTodaySeconds, target.rule.timeLimit.dailyLimitMinutes)
  ) {
    if (target.tabId !== undefined) {
      await enforceBlock(target.tabId, target.url, settings)
    }
    await stopSession()
    return
  }

  if (options?.persist) {
    await syncTracking(target)
  } else {
    await recoverSession(target)
  }
}

async function handleNavigation(tabId: number, url: string | undefined): Promise<void> {
  if (!url) {
    try {
      const tab = await chrome.tabs.get(tabId)
      url = tab.url
    } catch {
      return
    }
  }

  const settings = await maybeResetDailyUsage()
  const blocked = await enforceBlock(tabId, url, settings)
  if (blocked) {
    await stopSession()
    return
  }
  await evaluate({ persist: true })
}

async function liveSettings(): Promise<LiveSettingsResponse> {
  await flushSession({ continueSession: true })
  const settings = await maybeResetDailyUsage()
  const session = await getActiveSession()
  const liveUsageById: Record<string, number> = {}
  for (const rule of settings.websites) {
    liveUsageById[rule.id] = liveUsedSeconds(rule, session)
  }
  return { settings, liveUsageById, session }
}

function schedulePersistAlarm(): void {
  void chrome.alarms.create(PERSIST_ALARM, {
    periodInMinutes: PERSIST_ALARM_PERIOD_MINUTES,
  })
}

async function boot(): Promise<void> {
  if (chrome.idle?.setDetectionInterval) {
    chrome.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL_SECONDS)
  }
  await maybeResetDailyUsage()
  await scheduleDailyReset()
  schedulePersistAlarm()
  await evaluate()
}

function ensureBoot(): Promise<void> {
  booting ??= boot()
  return booting
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureBoot()
})

chrome.runtime.onStartup.addListener(() => {
  void ensureBoot()
})

void ensureBoot()

chrome.tabs.onActivated.addListener(() => {
  void ensureBoot().then(() => evaluate({ persist: true }))
})

chrome.tabs.onRemoved.addListener(() => {
  void ensureBoot().then(() => evaluate({ persist: true }))
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== 'loading') return
  void ensureBoot().then(() => handleNavigation(tabId, changeInfo.url ?? tab.url))
})

chrome.windows.onFocusChanged.addListener(() => {
  void ensureBoot().then(() => evaluate({ persist: true }))
})

chrome.idle.onStateChanged.addListener(() => {
  void ensureBoot().then(() => evaluate({ persist: true }))
})

function navigationUrl(details: { url?: string }): string | undefined {
  return details.url
}

function isTopFrame(details: { frameId: number; tabId: number }): boolean {
  return details.frameId === 0 && details.tabId >= 0
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (!isTopFrame(details)) return
  void ensureBoot().then(() => handleNavigation(details.tabId, navigationUrl(details)))
})

chrome.webNavigation.onCommitted.addListener((details) => {
  if (!isTopFrame(details)) return
  void ensureBoot().then(() => handleNavigation(details.tabId, navigationUrl(details)))
})

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (!isTopFrame(details)) return
  void ensureBoot().then(() => handleNavigation(details.tabId, navigationUrl(details)))
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (!('website-blocker:settings' in changes)) return
  void ensureBoot().then(() => evaluate({ persist: true }))
})

chrome.alarms.onAlarm.addListener((alarm) => {
  void ensureBoot().then(async () => {
    if (alarm.name === DAILY_RESET_ALARM) {
      await maybeResetDailyUsage()
      await scheduleDailyReset()
      await evaluate({ persist: true })
      return
    }
    if (alarm.name === PERSIST_ALARM) {
      await flushSession({ continueSession: true })
      await evaluate()
    }
  })
})

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse) => {
    const handle = async () => {
      await ensureBoot()
      switch (message.type) {
        case 'FLUSH_SESSION':
          await flushSession({ continueSession: true })
          sendResponse({ ok: true })
          return
        case 'GET_LIVE_SETTINGS':
          sendResponse(await liveSettings())
          return
        case 'EVALUATE_ACTIVE_TAB':
          await evaluate({ persist: true })
          sendResponse({ ok: true })
          return
        case 'OPEN_OPTIONS': {
          const url = chrome.runtime.getURL(
            `src/options/index.html${message.hash ?? ''}`,
          )
          await chrome.tabs.create({ url })
          sendResponse({ ok: true })
          return
        }
        default:
          sendResponse({ ok: false })
      }
    }
    void handle()
    return true
  },
)
