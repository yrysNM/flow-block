import { getSettings, mutateSettings } from '../shared/storage'
import { displayName, secondsToMinutes, usageRatio } from '../shared/time-utils'
import type { WebsiteRule } from '../shared/types'

async function notify(rule: WebsiteRule, title: string, message: string): Promise<void> {
  if (!chrome.notifications?.create) return
  await chrome.notifications.create(`website-blocker:${rule.id}:${title}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: 1,
  })
}

export async function maybeNotifyUsage(rule: WebsiteRule): Promise<void> {
  if (!rule.enabled || !rule.timeLimit.enabled || rule.blocking.enabled) return

  const settings = await getSettings()
  const ratio = usageRatio(rule.usage.usedTodaySeconds, rule.timeLimit.dailyLimitMinutes)
  const usedMinutes = secondsToMinutes(rule.usage.usedTodaySeconds)
  const limitMinutes = rule.timeLimit.dailyLimitMinutes
  const name = displayName(rule.domain)

  let notified80 = rule.usage.notified80
  let notified100 = rule.usage.notified100

  if (settings.notifications.atLimit && ratio >= 1 && !rule.usage.notified100) {
    await notify(
      rule,
      name,
      `You have used your ${limitMinutes}-minute limit for today.`,
    )
    notified100 = true
    notified80 = true
  } else if (
    settings.notifications.at80Percent &&
    ratio >= 0.8 &&
    !rule.usage.notified80
  ) {
    await notify(
      rule,
      name,
      `You've used ${usedMinutes} of your ${limitMinutes} minutes today.`,
    )
    notified80 = true
  }

  if (notified80 === rule.usage.notified80 && notified100 === rule.usage.notified100) {
    return
  }

  await mutateSettings((current) => ({
    ...current,
    websites: current.websites.map((item) =>
      item.id === rule.id
        ? {
            ...item,
            usage: { ...item.usage, notified80, notified100 },
          }
        : item,
    ),
  }))
}
