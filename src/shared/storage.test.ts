import { afterEach, describe, expect, it } from 'vitest'
import {
  addWebsite,
  createDefaultSettings,
  createMemoryAdapter,
  getSettings,
  resetDailyUsage,
  setStorageAdapter,
  updateWebsite,
} from './storage'
import { applyImport, createExportPayload, parseImportPayload } from './import-export'
import { getBlockDecision } from './blocking'
import { withDailyReset } from '../background/daily-reset'
import { resolveTrackingTarget } from '../background/tab-tracker'
import { applyUsageDelta, liveUsedSeconds } from '../background/time-tracker'
import type { WebsiteRule } from './types'

function seedAdapter() {
  const adapter = createMemoryAdapter()
  setStorageAdapter(adapter)
  return adapter
}

afterEach(() => {
  setStorageAdapter(null)
})

describe('storage', () => {
  it('prevents duplicate and overlapping domains', async () => {
    seedAdapter()
    await addWebsite({ domain: 'https://www.youtube.com/feed', timeLimit: true })
    await expect(addWebsite({ domain: 'music.youtube.com' })).rejects.toThrow(
      /already covers/,
    )
    await expect(addWebsite({ domain: 'youtube.com' })).rejects.toThrow(/already covers/)
    const reddit = await addWebsite({ domain: 'reddit.com', blocking: true })
    expect(reddit.domain).toBe('reddit.com')
    expect(reddit.blocking.enabled).toBe(true)
  })

  it('rejects invalid domains', async () => {
    seedAdapter()
    await expect(addWebsite({ domain: 'not a site' })).rejects.toThrow(/valid website/)
  })

  it('resets daily usage', async () => {
    seedAdapter()
    const site = await addWebsite({ domain: 'instagram.com', timeLimit: true })
    await updateWebsite(site.id, {
      usage: {
        ...site.usage,
        usedTodaySeconds: 999,
        notified80: true,
        notified100: true,
      },
    })
    const reset = await resetDailyUsage(new Date('2026-09-12T08:00:00'))
    expect(reset.websites[0]?.usage.usedTodaySeconds).toBe(0)
    expect(reset.websites[0]?.usage.notified80).toBe(false)
    expect(reset.lastResetDate).toBe('2026-09-12')
  })
})

describe('import/export', () => {
  it('round-trips settings and rejects invalid payloads', async () => {
    seedAdapter()
    await addWebsite({ domain: 'tiktok.com', dailyLimitMinutes: 15 })
    const settings = await getSettings()
    const payload = createExportPayload(settings)
    const parsed = parseImportPayload(JSON.parse(JSON.stringify(payload)))
    expect(parsed.websites[0]?.domain).toBe('tiktok.com')
    const applied = applyImport(createDefaultSettings(), parsed)
    expect(applied.websites).toHaveLength(1)

    expect(() => parseImportPayload({ version: 2, websites: [] })).toThrow(
      /Unsupported backup version/,
    )
    expect(() => parseImportPayload({ version: 1 })).toThrow(/websites list/)
    expect(() =>
      parseImportPayload({ version: 1, websites: [{ domain: 'not a domain' }] }),
    ).toThrow(/did not contain any valid websites/)
  })
})

describe('blocking decisions', () => {
  const rule = (overrides: Partial<WebsiteRule>): WebsiteRule => ({
    id: '1',
    domain: 'youtube.com',
    enabled: true,
    blocking: { enabled: false },
    timeLimit: { enabled: true, dailyLimitMinutes: 60 },
    usage: {
      usedTodaySeconds: 0,
      lastUpdated: new Date().toISOString(),
      notified80: false,
      notified100: false,
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  })

  it('blocks complete-block rules and limit-reached rules', () => {
    const blocked = createDefaultSettings()
    blocked.websites = [rule({ blocking: { enabled: true } })]
    expect(getBlockDecision('https://music.youtube.com', blocked).reason).toBe('blocked')

    const limited = createDefaultSettings()
    limited.websites = [
      rule({
        usage: {
          usedTodaySeconds: 60 * 60,
          lastUpdated: new Date().toISOString(),
          notified80: true,
          notified100: true,
        },
      }),
    ]
    expect(getBlockDecision('https://www.youtube.com', limited).reason).toBe('limit')
  })

  it('does not block when protection is disabled', () => {
    const settings = createDefaultSettings()
    settings.globalEnabled = false
    settings.websites = [rule({ blocking: { enabled: true } })]
    expect(getBlockDecision('https://youtube.com', settings).blocked).toBe(false)
  })
})

describe('daily reset', () => {
  it('clears usage when the local date changes', () => {
    const settings = createDefaultSettings(new Date('2026-09-11T10:00:00'))
    settings.websites = [
      {
        id: '1',
        domain: 'reddit.com',
        enabled: true,
        blocking: { enabled: false },
        timeLimit: { enabled: true, dailyLimitMinutes: 30 },
        usage: {
          usedTodaySeconds: 1200,
          lastUpdated: '2026-09-11T10:00:00.000Z',
          notified80: true,
          notified100: false,
        },
        createdAt: '2026-09-11T10:00:00.000Z',
      },
    ]
    const next = withDailyReset(settings, new Date('2026-09-12T00:01:00'))
    expect(next.lastResetDate).toBe('2026-09-12')
    expect(next.websites[0]?.usage.usedTodaySeconds).toBe(0)
    expect(next.websites[0]?.usage.notified80).toBe(false)
    expect(withDailyReset(next, new Date('2026-09-12T08:00:00'))).toBe(next)
  })
})

describe('active tab tracking', () => {
  const youtube: WebsiteRule = {
    id: 'yt',
    domain: 'youtube.com',
    enabled: true,
    blocking: { enabled: false },
    timeLimit: { enabled: true, dailyLimitMinutes: 60 },
    usage: {
      usedTodaySeconds: 10,
      lastUpdated: new Date().toISOString(),
      notified80: false,
      notified100: false,
    },
    createdAt: new Date().toISOString(),
  }

  const settings = { ...createDefaultSettings(), websites: [youtube] }

  it('counts only a focused active matching tab', () => {
    expect(
      resolveTrackingTarget(
        {
          windowFocused: true,
          idleState: 'active',
          tabUrl: 'https://www.youtube.com/watch?v=1',
          tabId: 3,
        },
        settings,
      )?.rule.id,
    ).toBe('yt')
  })

  it('pauses when the window is unfocused, idle, or on another site', () => {
    expect(
      resolveTrackingTarget(
        {
          windowFocused: false,
          idleState: 'active',
          tabUrl: 'https://youtube.com',
          tabId: 3,
        },
        settings,
      ),
    ).toBeNull()
    expect(
      resolveTrackingTarget(
        {
          windowFocused: true,
          idleState: 'idle',
          tabUrl: 'https://youtube.com',
          tabId: 3,
        },
        settings,
      ),
    ).toBeNull()
    expect(
      resolveTrackingTarget(
        {
          windowFocused: true,
          idleState: 'active',
          tabUrl: 'https://example.com',
          tabId: 3,
        },
        settings,
      ),
    ).toBeNull()
    expect(
      resolveTrackingTarget(
        {
          windowFocused: true,
          idleState: 'active',
          tabUrl: 'chrome://newtab/',
          tabId: 3,
        },
        settings,
      ),
    ).toBeNull()
  })

  it('does not track a completely blocked site', () => {
    const blocked = {
      ...settings,
      websites: [{ ...youtube, blocking: { enabled: true } }],
    }
    expect(
      resolveTrackingTarget(
        {
          windowFocused: true,
          idleState: 'active',
          tabUrl: 'https://youtube.com',
          tabId: 1,
        },
        blocked,
      ),
    ).toBeNull()
  })

  it('only adds live session time for the active matching rule', () => {
    const updated = applyUsageDelta(youtube, 20)
    expect(updated.usage.usedTodaySeconds).toBe(30)
    expect(
      liveUsedSeconds(updated, { ruleId: 'yt', domain: 'youtube.com', startedAt: 0 }, 15_000),
    ).toBe(45)
    expect(
      liveUsedSeconds(updated, { ruleId: 'other', domain: 'x.com', startedAt: 0 }, 15_000),
    ).toBe(30)
  })
})
