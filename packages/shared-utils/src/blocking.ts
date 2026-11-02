const PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i

export type BlockingMode = 'BLOCK' | 'ALLOW' | 'LIMIT'

export type BlockingReason = 'allowlist' | 'focus' | 'schedule' | 'limit' | 'none'

export interface BlockingRule {
  enabled: boolean
  mode: BlockingMode
  domain: string
  scheduleStartMinute: number | null
  scheduleEndMinute: number | null
  dailyLimitMinutes: number | null
  usedSeconds: number
}

export interface BlockingDecision {
  block: boolean
  reason: BlockingReason
}

/** Hostname only, lowercase, without a leading www. Invalid input returns null. */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 253 || /\s/.test(trimmed)) return null
  let candidate = trimmed
  if (!PROTOCOL_RE.test(candidate)) candidate = `https://${candidate}`
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    let host = parsed.hostname.trim().toLowerCase().replace(/\.+$/, '')
    if (host.startsWith('www.')) host = host.slice(4)
    if (!host || host.length > 253 || host.includes('..')) return null
    if (!host.includes('.') && host !== 'localhost') return null
    return host
  } catch {
    return null
  }
}

export function hostMatchesDomain(host: string, ruleDomain: string): boolean {
  const left = normalizeDomain(host)
  const right = normalizeDomain(ruleDomain)
  if (!left || !right) return false
  return left === right || left.endsWith(`.${right}`)
}

/**
 * A missing window means the rule is in force all day.
 * The end minute is exclusive. A window that starts after it ends wraps past midnight.
 */
export function isWithinSchedule(
  nowMinute: number,
  startMinute: number | null,
  endMinute: number | null,
): boolean {
  if (startMinute === null || endMinute === null) return true
  const now = ((nowMinute % 1440) + 1440) % 1440
  if (startMinute === endMinute) return true
  if (startMinute < endMinute) return now >= startMinute && now < endMinute
  return now >= startMinute || now < endMinute
}

/**
 * Focus mode blocks every matching blocklist rule, including outside its schedule
 * and before its daily limit. With no active session, a blocklist rule applies only
 * inside its schedule, and a daily limit blocks only after that many seconds.
 * An allowlist match is never blocked, even during focus and even if a block rule matches too.
 * A paused focus session still counts as active: the caller sets `focusActive` when `endedAt` is null.
 * This does not block the rest of the web. Only matching block rules do.
 */
export function shouldBlockWebsite(input: {
  focusActive: boolean
  nowMinute: number
  host: string
  rules: BlockingRule[]
}): BlockingDecision {
  const matching = input.rules.filter((rule) => rule.enabled && hostMatchesDomain(input.host, rule.domain))
  if (matching.some((rule) => rule.mode === 'ALLOW')) {
    return { block: false, reason: 'allowlist' }
  }
  for (const rule of matching) {
    if (rule.mode !== 'BLOCK' && rule.mode !== 'LIMIT') continue
    if (input.focusActive) return { block: true, reason: 'focus' }
    if (!isWithinSchedule(input.nowMinute, rule.scheduleStartMinute, rule.scheduleEndMinute)) continue
    const limitSeconds = rule.dailyLimitMinutes === null ? null : rule.dailyLimitMinutes * 60
    if (limitSeconds !== null && rule.usedSeconds < limitSeconds) continue
    if (limitSeconds !== null) return { block: true, reason: 'limit' }
    return { block: true, reason: 'schedule' }
  }
  return { block: false, reason: 'none' }
}
