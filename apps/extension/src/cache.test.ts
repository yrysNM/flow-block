import { describe, expect, it, vi } from 'vitest'
import {
  applyServerSync,
  closeOpenVisit,
  decideCachedBlock,
  emptyCache,
  enqueueUsage,
  flushUsageQueue,
  type CachedRule,
} from './cache'

function blockRule(overrides: Partial<CachedRule> = {}): CachedRule {
  return {
    id: 'rule-1',
    enabled: true,
    mode: 'BLOCK',
    domain: 'example.com',
    scheduleStartMinute: 9 * 60,
    scheduleEndMinute: 17 * 60,
    dailyLimitMinutes: null,
    usedSeconds: 0,
    ...overrides,
  }
}

describe('extension cache', () => {
  it('enforces focus mode from the cached rules when the network is not involved', () => {
    const cache = {
      ...emptyCache(),
      timezone: 'UTC',
      focusActive: true,
      rules: [blockRule()],
    }
    expect(decideCachedBlock(cache, 'https://example.com', new Date('2026-11-02T08:00:00.000Z'))).toEqual({
      block: true,
      reason: 'focus',
    })
    expect(decideCachedBlock({ ...cache, focusActive: false }, 'example.com', new Date('2026-11-02T08:00:00.000Z'))).toEqual({
      block: false,
      reason: 'none',
    })
  })

  it('keeps a failed usage post in the queue and ignores a duplicate client event id', async () => {
    const event = {
      clientEventId: 'event-1',
      domain: 'example.com',
      seconds: 5,
      occurredAt: '2026-11-02T12:00:00.000Z',
    }
    const queued = enqueueUsage(enqueueUsage(emptyCache(), event), event)
    expect(queued.pendingEvents).toHaveLength(1)

    const post = vi.fn(async () => {
      throw new Error('offline')
    })
    const kept = await flushUsageQueue(queued, post)
    expect(kept.pendingEvents).toEqual([event])

    const sent = await flushUsageQueue(queued, async () => {})
    expect(sent.pendingEvents).toEqual([])
  })

  it('closes an open visit into one queued event and adds the seconds locally', () => {
    const cache = closeOpenVisit({
      ...emptyCache(),
      timezone: 'UTC',
      usageDate: '2026-11-02',
      rules: [blockRule()],
      openVisit: {
        host: 'example.com',
        startedAt: Date.parse('2026-11-02T12:00:00.000Z'),
        clientEventId: 'event-1',
      },
    }, Date.parse('2026-11-02T12:00:30.000Z'), '2026-11-02')
    expect(cache.openVisit).toBeNull()
    expect(cache.pendingEvents).toEqual([{
      clientEventId: 'event-1',
      domain: 'example.com',
      seconds: 30,
      occurredAt: '2026-11-02T12:00:30.000Z',
    }])
    expect(cache.rules[0]?.usedSeconds).toBe(30)
    const twice = closeOpenVisit({ ...cache, openVisit: cache.pendingEvents[0] ? {
      host: 'example.com',
      startedAt: Date.parse('2026-11-02T12:00:00.000Z'),
      clientEventId: 'event-1',
    } : null }, Date.parse('2026-11-02T12:00:30.000Z'), '2026-11-02')
    expect(twice.pendingEvents).toHaveLength(1)
    expect(twice.rules[0]?.usedSeconds).toBe(30)
  })

  it('keeps unsent seconds on top of the server totals', () => {
    const synced = applyServerSync({
      ...emptyCache(),
      pendingEvents: [{
        clientEventId: 'event-1',
        domain: 'example.com',
        seconds: 15,
        occurredAt: '2026-11-02T12:00:00.000Z',
      }],
    }, {
      timezone: 'UTC',
      focusActive: false,
      date: '2026-11-02',
      rules: [blockRule()],
      totals: [{ ruleId: 'rule-1', usedSeconds: 10 }],
    })
    expect(synced.rules[0]?.usedSeconds).toBe(25)
    expect(synced.focusActive).toBe(false)
  })
})
