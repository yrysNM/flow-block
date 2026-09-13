import { afterEach, describe, expect, it } from 'vitest'
import { getBlockDecision } from './blocking'
import {
  addWebsite,
  createDefaultSettings,
  createMemoryAdapter,
  createUnlockRequest,
  decideUnlockRequest,
  deleteWebsite,
  getSettings,
  setStorageAdapter,
  updateWebsite,
} from './storage'
import { isRuleCurrentlyBlocking, isTrustedUnlockActive } from './unlock'

afterEach(() => {
  setStorageAdapter(null)
})

describe('trusted unlock', () => {
  it('blocks self-unlock and delete while a site is locked', async () => {
    setStorageAdapter(createMemoryAdapter())
    const site = await addWebsite({ domain: 'youtube.com', blocking: true })
    expect(isRuleCurrentlyBlocking(site)).toBe(true)
    await expect(updateWebsite(site.id, { enabled: false })).rejects.toThrow(/trusted person/)
    await expect(deleteWebsite(site.id)).rejects.toThrow(/trusted person/)
  })

  it('Accept unlocks the site until midnight and Denied keeps it blocked', async () => {
    setStorageAdapter(createMemoryAdapter())
    const site = await addWebsite({ domain: 'instagram.com', blocking: true })
    const { request } = await createUnlockRequest(site.id)
    expect(request.status).toBe('pending')

    const denied = await decideUnlockRequest(request.token, 'denied')
    expect(denied.status).toBe('denied')
    const stillBlocked = await getSettings()
    expect(
      getBlockDecision('https://www.instagram.com/reels', stillBlocked).blocked,
    ).toBe(true)

    const { request: again } = await createUnlockRequest(site.id)
    const accepted = await decideUnlockRequest(again.token, 'accepted')
    expect(accepted.status).toBe('accepted')
    const unlocked = await getSettings()
    const rule = unlocked.websites[0]
    expect(rule && isTrustedUnlockActive(rule)).toBe(true)
    expect(getBlockDecision('https://instagram.com', unlocked).blocked).toBe(false)
  })

  it('reuses a pending share link instead of creating duplicates', async () => {
    setStorageAdapter(createMemoryAdapter())
    const site = await addWebsite({ domain: 'reddit.com', blocking: true })
    const first = await createUnlockRequest(site.id)
    const second = await createUnlockRequest(site.id)
    expect(second.request.token).toBe(first.request.token)
    const settings = await getSettings()
    expect(settings.unlockRequests).toHaveLength(1)
  })
})

describe('unlock expiry', () => {
  it('does not treat a past unlockedUntil as active', () => {
    const settings = createDefaultSettings()
    settings.websites = [
      {
        id: '1',
        domain: 'tiktok.com',
        enabled: true,
        blocking: { enabled: true },
        timeLimit: { enabled: false, dailyLimitMinutes: 60 },
        usage: {
          usedTodaySeconds: 0,
          lastUpdated: new Date().toISOString(),
          notified80: false,
          notified100: false,
        },
        createdAt: new Date().toISOString(),
        unlockedUntil: new Date(Date.now() - 1000).toISOString(),
      },
    ]
    expect(getBlockDecision('https://tiktok.com', settings).blocked).toBe(true)
  })
})
